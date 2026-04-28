import GUI from 'lil-gui';
import * as THREE from 'three';
import { Engine } from '@/core/Engine';
import { buildPrototypeScene } from '@/scenes/PrototypeScene';
import { Character } from '@/core/Character';
import { PlayerController } from '@/core/PlayerController';
import { KarmaController, selectFormForAlignment } from '@/core/KarmaController';
import { TransformController } from '@/core/TransformController';
import { TransformBurst } from '@/vfx/TransformBurst';
import { CycleManager } from '@/core/CycleManager';
import { EnemyManager } from '@/combat/EnemyManager';
import { SlideCombat } from '@/combat/SlideCombat';
import { DamageNumbers } from '@/combat/DamageNumbers';
import { GuardianInvasion } from '@/combat/GuardianInvasion';
import { EconomyLoop } from '@/idle/EconomyLoop';
import { AdSimulator } from '@/monetization/AdSimulator';
import { HUD } from '@/ui/HUD';
import { TitleScreen } from '@/ui/TitleScreen';
import { PerformanceTier } from '@/render/PerformanceTier';
import { saveSystem } from '@/persistence/SaveSystem';
import '@/characters/placeholderParts';
import '@/characters/chefParts';
import '@/characters/boxerParts';
import { slotRegistry } from '@/core/SlotRegistry';
import { ManifestLoader } from '@/loaders/ManifestLoader';
import { COMBAT, JOBS, type JobId } from '@/config/balance';
import type { PixelTier } from '@/render/PixelRenderPipeline';

const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
if (!canvas) throw new Error('canvas#scene not found');

interface GameContext {
  engine: Engine;
  character: Character;
  playerCtl: PlayerController;
  karma: KarmaController;
  cycle: CycleManager;
  transformCtl: TransformController;
  vfx: TransformBurst;
  enemies: EnemyManager;
  slide: SlideCombat;
  damageNums: DamageNumbers;
  guardian: GuardianInvasion;
  economy: EconomyLoop;
  ads: AdSimulator;
  hud: HUD;
  perfTier: PerformanceTier;
  gui: GUI;
  player: PlayerState;
}

interface PlayerState {
  hp: number;
  maxHp: number;
  invulUntil: number;
  currentJob: JobId;
}

let ctx: GameContext | null = null;

async function bootGame(): Promise<void> {
  // GLB manifest 사전 로드 — procedural 부품과 같은 ID 면 GLB 가 우선.
  // manifest.json 이 비어있거나 누락되면 procedural 그대로 사용.
  const manifestResult = await ManifestLoader.load('/assets/parts/manifest.json').catch((e) => {
    console.warn('[boot] manifest load error', e);
    return { loaded: 0, failed: 0 };
  });

  const engine = new Engine(canvas!);
  buildPrototypeScene(engine.scene);

  const character = new Character('Protagonist');
  engine.scene.add(character.group);
  // applyForm 은 savedData 로드 후에 호출 (저장된 직업/시간대 반영)

  const playerCtl = new PlayerController({ character, camera: engine.camera });

  const karma = new KarmaController();
  karma.attach(character);

  const vfx = new TransformBurst(engine.scene, engine.camera);
  const transformCtl = new TransformController({ character, vfx });

  const cycle = new CycleManager();
  const enemies = new EnemyManager(engine.scene, engine.camera);
  const damageNums = new DamageNumbers(engine.camera, canvas!);
  const guardian = new GuardianInvasion(enemies, { getKarma: () => karma.getValue() });

  const slide = new SlideCombat({
    canvas: canvas!,
    camera: engine.camera,
    scene: engine.scene,
    enemies,
    damagePerSwipe: COMBAT.BASE_SLASH_DAMAGE,
    slashRadius: COMBAT.SLASH_RADIUS,
    onSlash: () => character.animation.play('attack_swing', { fadeIn: 0.05 }),
  });

  // 저장본 로드 (없으면 default)
  const savedData = saveSystem.load();
  const hasSave = saveSystem.hasSave();

  const economy = new EconomyLoop();
  economy.state.gold = savedData.gold;
  economy.state.job = savedData.job;
  karma.setValue(savedData.karma);

  const player: PlayerState = {
    hp: COMBAT.PLAYER_BASE_HP,
    maxHp: COMBAT.PLAYER_BASE_HP,
    invulUntil: 0,
    currentJob: savedData.job,
  };
  let totalPlayTime = savedData.totalPlayTime;

  // 저장된 폼 적용 (없으면 직업 기준 day 폼)
  const initialForm = slotRegistry.getForm(savedData.formId) ? savedData.formId : `${savedData.job}_day`;
  character.applyForm(slotRegistry.getForm(initialForm) ? initialForm : 'office_day');

  const ads = new AdSimulator({
    economy,
    onRevive: (invulSec) => {
      player.hp = player.maxHp;
      player.invulUntil = performance.now() + invulSec * 1000;
    },
    onGacha: (partId) => {
      console.log('[gacha]', partId);
    },
  });
  ads.restoreCooldowns(savedData.adCooldowns);

  const hud = new HUD({
    economy,
    cycle,
    karma,
    ads,
    onJobChange: (job) => switchJob(job),
    getPlayerHp: () => player.hp,
    getPlayerMaxHp: () => player.maxHp,
  });

  const perfTier = new PerformanceTier();

  const gui = setupGUI(engine, character, karma, transformCtl, cycle, hud);

  ctx = {
    engine, character, playerCtl, karma, cycle, transformCtl, vfx,
    enemies, slide, damageNums, guardian,
    economy, ads, hud, perfTier, gui, player,
  };

  // === 이벤트 와이어링 ===
  enemies.onDamage((e) => {
    damageNums.popAt(e.worldPosition, Math.round(e.damage).toString(), 'normal');
  });

  enemies.onKill((e) => {
    if (e.goldReward > 0) {
      economy.addKillReward(e.goldReward);
      damageNums.popAt(e.worldPosition.clone().add(new THREE.Vector3(0, 1.2, 0)), `+${e.goldReward} G`, 'gold');
    }
    if (e.karmaDelta !== 0) {
      karma.add(e.karmaDelta);
    }
  });

  enemies.onHitPlayer((e) => {
    if (performance.now() < player.invulUntil) return;
    player.hp = Math.max(0, player.hp - e.damage);
    damageNums.popAt(character.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), `-${e.damage}`, 'warn');
    character.animation.play('hit_react', { fadeIn: 0.04 });
    if (player.hp <= 0) {
      hud.toast('쓰러졌습니다 — 부활 광고를 보세요', 'warn');
    }
  });

  cycle.onPhaseChange(({ newPhase }) => {
    handlePhaseChange(newPhase);
  });

  karma.onChange((_v, alignment, prev) => {
    if (alignment === prev) return;
    if (!karma.isAutoSwapEnabled()) return;
    if (engine.lighting.getTimeOfDay() !== 'night') return;
    const target = selectFormForAlignment(player.currentJob, 'night', alignment);
    if (target && transformCtl.trigger(target.id, 'to_night')) {
      hud.toast(`${target.label} 으로 변신`, 'success');
    }
  });

  // === 프레임 콜백 ===
  engine.onFrame((dt) => {
    perfTier.tick();
    playerCtl.update(dt);
    transformCtl.update();
    vfx.update(dt);
    enemies.setPlayerPosition(character.group.position);
    enemies.update(dt);
    slide.update();
    guardian.update(dt);
    cycle.update(dt);

    economy.tick(dt, engine.lighting.getTimeOfDay() === 'day', karma.getValue());
    totalPlayTime += dt;

    // 자연 회복 (선 성향 강할 때만)
    if (karma.getAlignment() === 'good' && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + COMBAT.HP_REGEN_PER_SEC_GOOD_HALO * dt);
    }

    character.update(dt);

    hud.update();
    hud.applyKarmaToJobs(karma.getValue());
  });

  engine.start();
  cycle.start('day');
  engine.setTimeOfDay('day', true);

  // 부팅 후 1초 뒤 성능 벤치마크 시작 → tier 자동 적용
  setTimeout(async () => {
    const recommended = await perfTier.startBenchmark();
    engine.setPixelTier(recommended);
    hud.toast(`성능 자동 감지: ${recommended} tier`, 'success');
  }, 1500);

  // 자동 저장 — 매 10초
  saveSystem.startAutosave(() => ({
    gold: economy.state.gold,
    karma: karma.getValue(),
    job: player.currentJob,
    formId: character.getCurrentFormId() ?? 'office_day',
    cycleCount: 0,
    totalPlayTime,
    adCooldowns: ads.serializeCooldowns(),
  }), 10);

  if (hasSave) {
    hud.toast(`저장본 로드: ${savedData.gold.toLocaleString()} G, 카르마 ${savedData.karma.toFixed(2)}`, 'success');
  } else {
    hud.toast('낮 3분 / 밤 2분 사이클 시작', 'success');
  }
  setTimeout(() => hud.toast('WASD/화살표로 이동, 마우스 드래그로 슬라이드 공격', 'success'), 3500);
  if (manifestResult.loaded > 0) {
    setTimeout(() => hud.toast(`GLB 부품 ${manifestResult.loaded}개 로드됨`, 'success'), 5500);
  }
}

function switchJob(job: JobId): void {
  if (!ctx) return;
  ctx.player.currentJob = job;
  ctx.economy.setJob(job);
  const phase = ctx.engine.lighting.getTimeOfDay();
  if (phase === 'day') {
    const dayForm = `${job}_day`;
    if (slotRegistry.getForm(dayForm)) ctx.character.applyForm(dayForm);
  } else {
    const target = selectFormForAlignment(job, 'night', ctx.karma.getAlignment());
    if (target) ctx.character.applyForm(target.id);
  }
  ctx.hud.toast(`직업 변경: ${JOBS[job].goodLabel}/${JOBS[job].evilLabel}`, 'success');
}

function handlePhaseChange(newPhase: 'day' | 'night'): void {
  if (!ctx) return;
  ctx.engine.setTimeOfDay(newPhase);
  if (newPhase === 'night') {
    ctx.enemies.setActive(true);
    ctx.slide.setActive(true);
    ctx.guardian.rollForNight();
    const target = selectFormForAlignment(ctx.player.currentJob, 'night', ctx.karma.getAlignment());
    if (target) ctx.transformCtl.trigger(target.id, 'to_night');
    if (ctx.guardian.hasGuardian()) {
      const align = ctx.karma.getAlignment();
      const msg = align === 'evil' ? '⚠️ 가디언이 당신을 처단하러 왔습니다' : '✨ 가디언이 합류했습니다';
      ctx.hud.toast(msg, align === 'evil' ? 'warn' : 'success');
    }
  } else {
    ctx.enemies.setActive(false);
    ctx.slide.setActive(false);
    ctx.guardian.reset();
    ctx.transformCtl.trigger(`${ctx.player.currentJob}_day`, 'to_day');
    ctx.player.hp = ctx.player.maxHp;
  }
}

function setupGUI(
  engine: Engine,
  character: Character,
  karma: KarmaController,
  transformCtl: TransformController,
  cycle: CycleManager,
  hud: HUD,
): GUI {
  const gui = new GUI({ title: '디버그' });
  gui.close();

  const debug = {
    pixelEnabled: true,
    pixelTier: 'medium' as PixelTier,
    cycleSpeedMul: 1,
    karma: 0,
    autoSwap: true,
    forceForm: 'office_day',
    forcePhase: () => cycle.forceSwitch(),
  };

  const renderFolder = gui.addFolder('렌더');
  renderFolder
    .add(debug, 'pixelEnabled')
    .name('픽셀 파이프라인')
    .onChange((v: boolean) => engine.setPixelEnabled(v));
  renderFolder
    .add(debug, 'pixelTier', ['low', 'medium', 'high'])
    .name('해상도 tier')
    .onChange((v: PixelTier) => engine.setPixelTier(v));

  const cycleFolder = gui.addFolder('사이클');
  cycleFolder
    .add(debug, 'cycleSpeedMul', 1, 60, 1)
    .name('속도 ×')
    .onChange((v: number) => cycle.setSpeedMultiplier(v));
  cycleFolder.add(debug, 'forcePhase').name('강제 전환');

  const karmaFolder = gui.addFolder('카르마');
  karmaFolder
    .add(debug, 'karma', -1, 1, 0.01)
    .name('값')
    .onChange((v: number) => karma.setValue(v));
  karmaFolder
    .add(debug, 'autoSwap')
    .name('임계값 자동 swap')
    .onChange((v: boolean) => karma.setAutoSwapEnabled(v));

  const formFolder = gui.addFolder('폼 강제');
  const formIds = slotRegistry.listForms().map((f) => f.id);
  formFolder
    .add(debug, 'forceForm', formIds)
    .name('폼 ID')
    .onChange((v: string) => {
      character.applyForm(v);
      hud.toast(`폼: ${v}`, 'success');
    });
  formFolder
    .add(
      {
        triggerNight: () => transformCtl.trigger(debug.forceForm, 'to_night'),
        triggerDay: () => transformCtl.trigger(debug.forceForm, 'to_day'),
      },
      'triggerNight',
    )
    .name('야간 변신 시퀀스');

  const saveFolder = gui.addFolder('세이브');
  saveFolder
    .add({
      manualSave: () => {
        if (!ctx) return;
        saveSystem.save({
          gold: ctx.economy.state.gold,
          karma: ctx.karma.getValue(),
          job: ctx.player.currentJob,
          formId: ctx.character.getCurrentFormId() ?? 'office_day',
          cycleCount: 0,
          totalPlayTime: 0,
          adCooldowns: ctx.ads.serializeCooldowns(),
        });
        hud.toast('수동 저장 완료', 'success');
      },
    }, 'manualSave')
    .name('지금 저장');
  saveFolder
    .add({
      reset: () => {
        if (!confirm('정말로 모든 진행을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        saveSystem.clear();
        location.reload();
      },
    }, 'reset')
    .name('진행 초기화 (페이지 새로고침)');

  return gui;
}

new TitleScreen({ onStart: bootGame });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (!ctx) return;
    ctx.engine.dispose();
    ctx.gui.destroy();
    ctx.vfx.dispose();
    ctx.character.dispose();
    ctx.slide.dispose();
    ctx.damageNums.dispose();
    ctx.hud.dispose();
    ctx.playerCtl.dispose();
    saveSystem.stopAutosave();
    ctx = null;
  });
}
