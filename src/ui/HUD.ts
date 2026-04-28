import type { EconomyLoop } from '@/idle/EconomyLoop';
import type { CycleManager } from '@/core/CycleManager';
import type { KarmaController } from '@/core/KarmaController';
import type { AdSimulator, AdSlot, AdResult } from '@/monetization/AdSimulator';
import type { JobId } from '@/config/balance';
import { JOBS } from '@/config/balance';

const STYLE_ID = 'hud-style';
const CSS = `
.hud-root {
  position: fixed; inset: 0; pointer-events: none; z-index: 20;
  font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif;
  color: #e8ecff;
}
.hud-root > * { pointer-events: auto; }

.hud-top {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 10px; align-items: center;
  padding: 8px 14px; border-radius: 12px;
  background: rgba(10,12,30,0.7); border: 1px solid rgba(155,181,255,0.35);
  backdrop-filter: blur(6px);
}
.hud-stat { display: flex; gap: 6px; align-items: center; padding: 0 8px; font-size: 14px; }
.hud-stat.gold { color: #ffd966; }
.hud-stat.hp { color: #ff8898; }
.hud-stat.fever { color: #ffae5a; font-weight: 700; }
.hud-stat .lbl { opacity: 0.65; font-size: 12px; }
.hud-stat .val { font-weight: 700; font-variant-numeric: tabular-nums; }

.hud-phase {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 0 12px; border-left: 1px solid rgba(255,255,255,0.12); border-right: 1px solid rgba(255,255,255,0.12);
}
.hud-phase .name { font-weight: 800; font-size: 14px; letter-spacing: 0.05em; }
.hud-phase .name.day { color: #ffe680; }
.hud-phase .name.night { color: #9bb5ff; }
.hud-phase .bar {
  width: 110px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.12); overflow: hidden;
}
.hud-phase .bar > div { height: 100%; transition: width 0.2s linear; }
.hud-phase .bar.day > div { background: linear-gradient(90deg, #ffd966, #ffae5a); }
.hud-phase .bar.night > div { background: linear-gradient(90deg, #5a7adf, #9bb5ff); }

.hud-karma {
  position: absolute; top: 76px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 10px;
  background: rgba(10,12,30,0.55); border: 1px solid rgba(155,181,255,0.25);
}
.hud-karma .karma-bar {
  position: relative; width: 240px; height: 8px; border-radius: 4px;
  background: linear-gradient(90deg, #6620a0 0%, #6620a0 35%, #4a4a5a 50%, #c8a64a 65%, #c8a64a 100%);
  overflow: hidden;
}
.hud-karma .karma-cursor {
  position: absolute; top: -3px; width: 4px; height: 14px; border-radius: 2px;
  background: #fff; box-shadow: 0 0 6px rgba(255,255,255,0.7);
  transform: translateX(-50%);
}
.hud-karma .lbl { font-size: 12px; opacity: 0.8; }
.hud-karma .align { font-size: 12px; font-weight: 700; min-width: 50px; text-align: right; }
.hud-karma .align.good { color: #ffd966; }
.hud-karma .align.evil { color: #c070ff; }
.hud-karma .align.neutral { color: #9aa0b4; }

.hud-jobs {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 8px;
}
.hud-job-btn {
  appearance: none; cursor: pointer; font-family: inherit;
  background: rgba(20,22,40,0.75); color: #e8ecff;
  border: 1px solid rgba(155,181,255,0.3); border-radius: 10px;
  padding: 10px 14px; font-size: 13px; font-weight: 600;
  display: flex; flex-direction: column; gap: 2px; min-width: 130px;
  transition: border-color 0.15s, background 0.15s;
}
.hud-job-btn:hover { border-color: rgba(255,217,102,0.7); background: rgba(40,30,20,0.9); }
.hud-job-btn.active {
  border-color: rgba(255,217,102,0.8);
  background: linear-gradient(180deg, rgba(80,60,30,0.9), rgba(40,30,16,0.9));
  box-shadow: 0 0 12px rgba(255,180,80,0.25);
}
.hud-job-btn .branch { font-size: 11px; opacity: 0.75; }
.hud-job-btn .branch.locked { color: #6a6a78; }
.hud-job-btn .branch.evil { color: #c070ff; }
.hud-job-btn .branch.good { color: #ffd966; }

.hud-ads {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 8px;
}
.hud-ad-btn {
  appearance: none; cursor: pointer; font-family: inherit;
  background: rgba(20,22,40,0.75); color: #e8ecff;
  border: 1px solid rgba(155,181,255,0.3); border-radius: 10px;
  padding: 10px 14px; font-size: 12px; font-weight: 600;
  min-width: 150px; text-align: left;
  display: flex; flex-direction: column; gap: 2px;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s;
}
.hud-ad-btn:hover { border-color: rgba(155,181,255,0.7); background: rgba(30,30,50,0.9); }
.hud-ad-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.hud-ad-btn .ad-tag { font-size: 10px; opacity: 0.65; letter-spacing: 0.05em; }
.hud-ad-btn .ad-cd { font-size: 10px; color: #ff8898; }

.hud-toast-stack {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.hud-toast {
  padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
  background: rgba(20,18,40,0.85); border: 1px solid rgba(155,181,255,0.4);
  animation: hud-toast-life 2.4s ease-out forwards;
}
.hud-toast.success { border-color: rgba(255,217,102,0.7); color: #ffd966; }
.hud-toast.warn { border-color: rgba(255,80,112,0.7); color: #ff8898; }
@keyframes hud-toast-life {
  0%   { opacity: 0; transform: translateY(8px); }
  10%  { opacity: 1; transform: translateY(0); }
  85%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-8px); }
}
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export interface HUDOptions {
  economy: EconomyLoop;
  cycle: CycleManager;
  karma: KarmaController;
  ads: AdSimulator;
  onJobChange: (job: JobId) => void;
  getPlayerHp: () => number;
  getPlayerMaxHp: () => number;
}

export class HUD {
  private root: HTMLDivElement;
  private goldVal!: HTMLSpanElement;
  private hpVal!: HTMLSpanElement;
  private feverNode!: HTMLDivElement;
  private feverVal!: HTMLSpanElement;
  private phaseName!: HTMLDivElement;
  private phaseBarFill!: HTMLDivElement;
  private phaseBar!: HTMLDivElement;
  private karmaCursor!: HTMLDivElement;
  private karmaAlignText!: HTMLSpanElement;
  private jobButtons = new Map<JobId, HTMLButtonElement>();
  private adButtons = new Map<AdSlot, HTMLButtonElement>();
  private toastStack!: HTMLDivElement;
  private opts: HUDOptions;

  constructor(opts: HUDOptions) {
    this.opts = opts;
    ensureStyles();
    this.root = document.createElement('div');
    this.root.className = 'hud-root';
    document.body.appendChild(this.root);
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-stat gold">
          <span class="lbl">골드</span><span class="val" data-id="gold">0</span>
        </div>
        <div class="hud-phase">
          <div class="name day" data-id="phase-name">낮</div>
          <div class="bar day" data-id="phase-bar"><div data-id="phase-fill" style="width:100%"></div></div>
        </div>
        <div class="hud-stat hp">
          <span class="lbl">HP</span><span class="val" data-id="hp">100</span>
        </div>
        <div class="hud-stat fever" data-id="fever-node" style="display:none">
          <span class="lbl">피버</span><span class="val" data-id="fever">0s</span>
        </div>
      </div>
      <div class="hud-karma">
        <span class="lbl">카르마</span>
        <div class="karma-bar"><div class="karma-cursor" data-id="karma-cursor"></div></div>
        <span class="align neutral" data-id="karma-align">중립</span>
      </div>
      <div class="hud-jobs" data-id="jobs"></div>
      <div class="hud-ads" data-id="ads"></div>
      <div class="hud-toast-stack" data-id="toasts"></div>
    `;
    this.goldVal = this.q('gold');
    this.hpVal = this.q('hp');
    this.feverNode = this.q<HTMLDivElement>('fever-node');
    this.feverVal = this.q('fever');
    this.phaseName = this.q<HTMLDivElement>('phase-name');
    this.phaseBar = this.q<HTMLDivElement>('phase-bar');
    this.phaseBarFill = this.q<HTMLDivElement>('phase-fill');
    this.karmaCursor = this.q<HTMLDivElement>('karma-cursor');
    this.karmaAlignText = this.q('karma-align');
    this.toastStack = this.q<HTMLDivElement>('toasts');

    this.buildJobButtons();
    this.buildAdButtons();
  }

  private q<T extends HTMLElement = HTMLSpanElement>(id: string): T {
    return this.root.querySelector(`[data-id="${id}"]`) as T;
  }

  private buildJobButtons(): void {
    const container = this.q<HTMLDivElement>('jobs');
    container.innerHTML = '';
    const order: JobId[] = ['office', 'chef', 'boxer'];
    const labels: Record<JobId, string> = { office: '회사원', chef: '셰프', boxer: '복서' };
    for (const job of order) {
      const balance = JOBS[job];
      const btn = document.createElement('button');
      btn.className = 'hud-job-btn';
      btn.innerHTML = `
        <div>${labels[job]}</div>
        <div class="branch good" data-branch="good">${balance.goodLabel}</div>
        <div class="branch evil" data-branch="evil">${balance.evilLabel}</div>
      `;
      btn.addEventListener('click', () => {
        this.opts.onJobChange(job);
        this.markActiveJob(job);
      });
      container.appendChild(btn);
      this.jobButtons.set(job, btn);
    }
    this.markActiveJob(this.opts.economy.state.job);
  }

  private buildAdButtons(): void {
    const container = this.q<HTMLDivElement>('ads');
    container.innerHTML = '';
    const slots: Array<{ id: AdSlot; tag: string; label: string }> = [
      { id: 'reward_double', tag: '보상형', label: '수익 ×2 (즉시)' },
      { id: 'fever', tag: '보상형', label: '피버 60초 ×5' },
      { id: 'gacha', tag: '보상형', label: '임시 파츠 뽑기' },
      { id: 'revive', tag: '전면', label: '부활 (전투 중)' },
    ];
    for (const slot of slots) {
      const btn = document.createElement('button');
      btn.className = 'hud-ad-btn';
      btn.innerHTML = `
        <span class="ad-tag">[${slot.tag}] 광고 시뮬</span>
        <span>${slot.label}</span>
        <span class="ad-cd" data-id="cd"></span>
      `;
      btn.addEventListener('click', () => {
        const result = this.opts.ads.watch(slot.id);
        if (result) this.toast(result.message, 'success');
      });
      container.appendChild(btn);
      this.adButtons.set(slot.id, btn);
    }
  }

  private markActiveJob(job: JobId): void {
    for (const [j, btn] of this.jobButtons) {
      btn.classList.toggle('active', j === job);
    }
    this.applyKarmaToJobs(this.opts.karma.getValue());
  }

  /** 카르마에 따라 직업 버튼의 분기 라벨을 잠금/해금 표시. */
  applyKarmaToJobs(karma: number): void {
    for (const [, btn] of this.jobButtons) {
      const goodEl = btn.querySelector('[data-branch="good"]') as HTMLDivElement;
      const evilEl = btn.querySelector('[data-branch="evil"]') as HTMLDivElement;
      if (karma > 0) {
        goodEl.classList.remove('locked');
        evilEl.classList.add('locked');
      } else if (karma < 0) {
        evilEl.classList.remove('locked');
        goodEl.classList.add('locked');
      } else {
        goodEl.classList.remove('locked');
        evilEl.classList.remove('locked');
      }
    }
  }

  toast(msg: string, kind: 'success' | 'warn' = 'success'): void {
    const el = document.createElement('div');
    el.className = `hud-toast ${kind}`;
    el.textContent = msg;
    this.toastStack.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  update(): void {
    const eco = this.opts.economy.state;
    this.goldVal.textContent = Math.floor(eco.gold).toLocaleString();
    const hp = this.opts.getPlayerHp();
    this.hpVal.textContent = `${Math.max(0, Math.round(hp))} / ${this.opts.getPlayerMaxHp()}`;

    if (this.opts.economy.isFeverActive()) {
      this.feverNode.style.display = '';
      this.feverVal.textContent = `${this.opts.economy.feverRemainingSec().toFixed(0)}s`;
    } else {
      this.feverNode.style.display = 'none';
    }

    const phase = this.opts.cycle.getPhase();
    this.phaseName.className = `name ${phase}`;
    this.phaseName.textContent = phase === 'day' ? '낮' : '밤';
    this.phaseBar.className = `bar ${phase}`;
    this.phaseBarFill.style.width = `${(this.opts.cycle.getRemainingFraction() * 100).toFixed(1)}%`;

    const karma = this.opts.karma.getValue();
    const align = this.opts.karma.getAlignment();
    const pct = ((karma + 1) * 0.5) * 100;
    this.karmaCursor.style.left = `${pct}%`;
    this.karmaAlignText.className = `align ${align}`;
    this.karmaAlignText.textContent = align === 'good' ? '선' : align === 'evil' ? '악' : '중립';

    for (const [slot, btn] of this.adButtons) {
      const cd = this.opts.ads.cooldownRemaining(slot);
      const cdEl = btn.querySelector('[data-id="cd"]') as HTMLSpanElement;
      if (cd > 0) {
        cdEl.textContent = `재사용 ${cd.toFixed(0)}초`;
        btn.disabled = true;
      } else {
        cdEl.textContent = '';
        btn.disabled = false;
      }
    }
  }

  /** 광고 결과 외부 toast 트리거 */
  notify(result: AdResult): void {
    this.toast(result.message, 'success');
  }

  dispose(): void {
    this.root.remove();
  }
}
