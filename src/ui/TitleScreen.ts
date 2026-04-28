/**
 * 타이틀 화면 — 첫 접속 시 나타나는 메뉴.
 * native-res HTML 오버레이로 구현하여 한글 가독성 보장.
 */

const STYLE_ID = 'title-screen-style';
const CSS = `
.title-screen {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, rgba(20,18,40,0.55) 0%, rgba(5,6,16,0.92) 70%);
  backdrop-filter: blur(2px);
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif;
  color: #e8ecff;
  animation: title-fade-in 0.6s ease-out;
}
@keyframes title-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes title-fade-out { from { opacity: 1; } to { opacity: 0; } }
.title-screen.is-leaving { animation: title-fade-out 0.45s ease-in forwards; }
.title-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 56px; gap: 16px;
}
.title-ko {
  font-size: clamp(28px, 5vw, 56px);
  font-weight: 800; letter-spacing: -0.02em;
  text-shadow: 0 0 18px rgba(155,181,255,0.35), 0 2px 0 rgba(0,0,0,0.5);
  margin: 0;
}
.title-sub {
  font-size: clamp(14px, 2vw, 20px);
  font-weight: 500; opacity: 0.8;
  margin: 0 0 20px 0; letter-spacing: 0.02em;
}
.title-buttons {
  display: flex; flex-direction: column; gap: 12px; width: min(280px, 80vw);
}
.title-btn {
  appearance: none; border: 1px solid rgba(155,181,255,0.4);
  background: linear-gradient(180deg, rgba(40,46,80,0.85), rgba(20,24,48,0.85));
  color: #e8ecff; padding: 14px 20px; font-size: 16px; font-weight: 600;
  border-radius: 10px; cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
  font-family: inherit;
}
.title-btn:hover {
  border-color: rgba(255,217,102,0.7);
  background: linear-gradient(180deg, rgba(60,52,80,0.95), rgba(30,24,40,0.95));
  transform: translateY(-1px);
}
.title-btn.primary {
  border-color: rgba(255,217,102,0.6);
  background: linear-gradient(180deg, rgba(110,84,40,0.85), rgba(60,40,16,0.85));
  box-shadow: 0 0 18px rgba(255,180,80,0.3);
}
.title-btn.primary:hover {
  background: linear-gradient(180deg, rgba(160,124,60,0.95), rgba(90,60,24,0.95));
}
.modal-backdrop {
  position: fixed; inset: 0; z-index: 110;
  background: rgba(5,6,16,0.85); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  animation: title-fade-in 0.3s ease-out;
}
.modal-card {
  max-width: 640px; width: min(640px, 92vw); max-height: 80vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(28,32,58,0.98), rgba(14,16,32,0.98));
  border: 1px solid rgba(155,181,255,0.35); border-radius: 14px;
  padding: 28px 32px; color: #e8ecff;
  font-family: inherit;
}
.modal-card h2 {
  margin: 0 0 8px 0; font-size: 24px; font-weight: 800;
  color: #ffd966;
}
.modal-card h3 {
  margin: 20px 0 8px 0; font-size: 16px; font-weight: 700;
  color: #9bb5ff;
}
.modal-card p {
  margin: 6px 0; font-size: 14px; line-height: 1.7; opacity: 0.92;
}
.modal-card ul {
  margin: 6px 0; padding-left: 22px; font-size: 14px; line-height: 1.7;
}
.modal-card li { margin: 4px 0; }
.modal-card .tag {
  display: inline-block; padding: 2px 8px; margin-right: 4px;
  background: rgba(155,181,255,0.18); border-radius: 4px;
  font-size: 12px; font-weight: 600;
}
.modal-card .tag.good { background: rgba(255,217,102,0.2); color: #ffd966; }
.modal-card .tag.evil { background: rgba(192,112,255,0.2); color: #c070ff; }
.modal-portrait-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
  margin: 16px 0;
}
.portrait {
  aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden;
  border: 1px solid rgba(155,181,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; text-align: center; padding: 8px;
}
.portrait.day { background: linear-gradient(135deg, #4a5a8a, #2a3a5a); }
.portrait.chef { background: linear-gradient(135deg, #5a6a9a, #2a3a5a); }
.portrait.knight { background: linear-gradient(135deg, #4a4a6a, #1a1a2a); }
.portrait.demon { background: linear-gradient(135deg, #6a2840, #2a1018); }
.modal-close-row {
  display: flex; justify-content: flex-end; margin-top: 18px;
}
`;

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export interface TitleScreenOptions {
  onStart: () => void;
}

export class TitleScreen {
  private root: HTMLDivElement;
  private opts: TitleScreenOptions;
  private modalEl: HTMLDivElement | null = null;

  constructor(opts: TitleScreenOptions) {
    this.opts = opts;
    injectStyles();
    this.root = this.build();
    document.body.appendChild(this.root);
  }

  private build(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'title-screen';
    root.innerHTML = `
      <div class="title-card">
        <h1 class="title-ko">늑대인간 키우기</h1>
        <p class="title-sub">낮과 밤의 이면 — Raising a Lycanthrope: Day and Night</p>
        <div class="title-buttons">
          <button class="title-btn primary" data-action="start">시작하기</button>
          <button class="title-btn" data-action="info">늑대인간이란?</button>
        </div>
      </div>
    `;
    root.querySelector('[data-action="start"]')?.addEventListener('click', () => this.startGame());
    root.querySelector('[data-action="info"]')?.addEventListener('click', () => this.openInfo());
    return root;
  }

  private startGame(): void {
    this.root.classList.add('is-leaving');
    setTimeout(() => {
      this.root.remove();
      this.opts.onStart();
    }, 450);
  }

  private openInfo(): void {
    if (this.modalEl) return;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-card">
        <h2>늑대인간이란?</h2>
        <p>
          평범한 마을 <strong>'루나틱 빌리지'</strong> 의 주인공은 대대로 내려오는 늑대인간의 혈통을 물려받았다.
          평상시엔 사회의 구성원으로 살아가지만, 보름달이 뜨기 시작하는 밤이 되면 본능이 깨어난다.
        </p>

        <div class="modal-portrait-grid">
          <div class="portrait day">낮 — 정장 차림의 사회인</div>
          <div class="portrait chef">밤 (선) — 천사의 셰프</div>
          <div class="portrait knight">밤 (선) — 수호 기사</div>
          <div class="portrait demon">밤 (악) — 악마의 복서</div>
        </div>

        <h3>게임 진행 방식</h3>
        <ul>
          <li><strong>낮 (3분)</strong> — 회사원/요리사/복서 직업으로 방치형 수익을 쌓는다.</li>
          <li><strong>밤 (2분)</strong> — 늑대인간으로 변신해 슬라이드 전투로 요괴를 사냥한다.</li>
          <li><strong>선과 악의 분기</strong> — 행동에 따라 카르마가 변하며, 의상·능력·해금 콘텐츠가 갈린다.</li>
        </ul>

        <h3>두 갈래 길</h3>
        <p>
          <span class="tag good">선 — 가디언</span>
          마을의 수호자. 안정적인 승진과 명성, 가디언 NPC 의 조력. 성장 속도는 느리지만 리스크가 낮다.
        </p>
        <p>
          <span class="tag evil">악 — 디스트로이어</span>
          밤의 포식자. 횡령·암거래·지하 격투장 해금, 폭발적 단기 수익.
          단, 낮 활동에 패널티와 가디언의 추격이 따른다.
        </p>

        <h3>가디언 시스템</h3>
        <p>
          밤 전투 중 일정 확률로 마을 가디언이 등장한다.
          카르마가 양수면 조력자로 합류해 적을 무찌르지만,
          카르마가 음수면 주인공을 처단하러 나타난다.
          가디언을 쓰러뜨리면 일반 요괴의 10배 골드와 희귀 성물을 얻을 수 있다.
        </p>

        <div class="modal-close-row">
          <button class="title-btn" data-action="close">닫기</button>
        </div>
      </div>
    `;
    modal.querySelector('[data-action="close"]')?.addEventListener('click', () => this.closeInfo());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeInfo();
    });
    document.body.appendChild(modal);
    this.modalEl = modal;
  }

  private closeInfo(): void {
    if (!this.modalEl) return;
    this.modalEl.remove();
    this.modalEl = null;
  }

  dispose(): void {
    this.root.remove();
    if (this.modalEl) this.modalEl.remove();
  }
}
