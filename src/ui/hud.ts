import type { Action, Input } from '../core/input';
import { ICONS, mico, richText } from './icons';
import { itemIconUrl, weaponIconUrl } from './itemIcons';
import type { ClassId } from '../data/classes';
import { Joystick } from './joystick';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = '') => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
};

export type HudMode = 'village' | 'dungeon' | 'home';

/** 플레이 화면 HUD */
export class Hud {
  readonly root: HTMLDivElement;
  readonly joystick: Joystick;
  private portrait: HTMLDivElement;
  private hpFill: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private mpFill: HTMLDivElement;
  private mpText: HTMLSpanElement;
  private expFill: HTMLDivElement;
  private lvText: HTMLSpanElement;
  private goldEl: HTMLDivElement;
  private locationEl: HTMLDivElement;
  private objectiveEl: HTMLDivElement;
  private bossEl: HTMLDivElement;
  private bossFill: HTMLDivElement;
  private bossName: HTMLDivElement;
  private minimapSlot: HTMLDivElement;
  private attackBtn: HTMLButtonElement;
  private interactBtn: HTMLButtonElement;
  private interactLabel: HTMLSpanElement;
  private bigMapEl: HTMLDivElement;
  private bubbleLayer: HTMLDivElement;
  private bubblePool: HTMLButtonElement[] = [];
  private attackIcon: HTMLSpanElement;
  private attackLabel: HTMLSpanElement;
  private dodgeShade: HTMLDivElement;
  private skillBtns: HTMLButtonElement[] = [];
  private skillShades: HTMLDivElement[] = [];
  private skillLabels: HTMLSpanElement[] = [];
  private potionBtn: HTMLButtonElement;
  private potionCount: HTMLSpanElement;
  private bagBtn: HTMLButtonElement;
  private bagCount: HTMLSpanElement;
  private invBtn: HTMLButtonElement;
  private buildBtn: HTMLButtonElement;
  private toastEl: HTMLDivElement;
  private floatLayer: HTMLDivElement;
  private labelLayer: HTMLDivElement;
  private labelPool: HTMLDivElement[] = [];
  private toastTimer = 0;
  private lastInteract: string | null = '';
  private lastBars = '';

  constructor(
    parent: HTMLElement,
    private input: Input,
    private onPress: () => void,
  ) {
    this.root = el('div', 'hud');
    parent.appendChild(this.root);

    const joyZone = el('div', 'joy-zone');
    this.root.appendChild(joyZone);
    this.joystick = new Joystick(joyZone, input);

    this.labelLayer = el('div', 'label-layer');
    this.floatLayer = el('div', 'float-layer');
    this.bubbleLayer = el('div', 'bubble-layer');
    this.root.append(this.labelLayer, this.bubbleLayer, this.floatLayer);

    // 좌상단 상태
    const status = el('div', 'status');
    this.portrait = el('div', 'portrait', '검');
    const bars = el('div', 'bars');
    const bar = (cls: string) => {
      const b = el('div', `bar ${cls}`);
      const fill = el('div', 'fill');
      const txt = el('span');
      b.append(fill, txt);
      bars.appendChild(b);
      return [fill, txt] as const;
    };
    [this.hpFill, this.hpText] = bar('hp');
    [this.mpFill, this.mpText] = bar('mp');
    const exp = el('div', 'bar exp');
    this.expFill = el('div', 'fill');
    this.lvText = el('span');
    exp.append(this.expFill, this.lvText);
    bars.appendChild(exp);
    status.append(this.portrait, bars);
    this.locationEl = el('div', 'tier-label');
    this.goldEl = el('div', 'gold-label');
    const infoRow = el('div', 'info-row');
    infoRow.append(this.locationEl, this.goldEl);
    status.appendChild(infoRow);
    this.buffEl = el('div', 'buffs');
    status.appendChild(this.buffEl);
    this.objectiveEl = el('div', 'objective');
    this.objectiveEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.objectiveOpen = !this.objectiveOpen;
      this.onObjectiveToggle?.(this.objectiveOpen);
      this.setObjective(this.objectiveText);
    });
    status.appendChild(this.objectiveEl);
    // 획득 로그 (퀘스트 알림판 아래)
    this.logEl = el('div', 'loot-log');
    status.appendChild(this.logEl);
    // 지난 로그 전부 보기 (채팅창처럼)
    this.logBtn = el('button', 'log-btn');
    this.logBtn.textContent = '💬 기록';
    const openLog = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleLogPanel();
    };
    this.logBtn.addEventListener('pointerdown', openLog);
    this.logEl.addEventListener('pointerdown', openLog);
    status.appendChild(this.logBtn);
    this.logPanel = el('div', 'log-panel hidden');
    this.logPanel.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.logPanel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    this.root.appendChild(this.logPanel);
    this.root.appendChild(status);

    // 보스 체력바
    this.bossEl = el('div', 'boss-bar hidden');
    this.bossName = el('div', 'boss-name');
    const bb = el('div', 'boss-track');
    this.bossFill = el('div', 'boss-fill');
    bb.appendChild(this.bossFill);
    this.bossEl.append(this.bossName, bb);
    this.root.appendChild(this.bossEl);

    // 우상단
    const topRight = el('div', 'top-right');
    this.minimapSlot = el('div', 'minimap-slot');
    // 미니맵을 누르면 큰 지도
    this.minimapSlot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.press('map');
    });
    const menuCol = el('div', 'menu-col');
    this.bagBtn = this.button('icon-btn', mico('bag', ICONS.bag), 'bag');
    this.bagCount = el('span', 'badge');
    this.bagBtn.appendChild(this.bagCount);
    this.invBtn = this.button('icon-btn', mico('armor', ICONS.person), 'char');
    this.buildBtn = this.button('icon-btn build-btn', mico('hammer', ICONS.hammer), 'build');
    const recipeBtn = this.button('icon-btn recipe-btn', mico('book', ICONS.book), 'recipes');
    // 방을 정리한 뒤 언제든 워프 창을 여는 버튼 (자원을 캐고 바로 돌아갈 때)
    this.warpBtn = this.button('warp-btn hidden', `${mico('portal', ICONS.warp)}<span>워프</span>`, 'warp');
    this.root.appendChild(this.warpBtn);
    menuCol.append(this.button('icon-btn', ICONS.pause, 'pause'), this.bagBtn, this.invBtn, this.buildBtn, recipeBtn);
    topRight.append(this.minimapSlot, menuCol);
    this.root.appendChild(topRight);

    // 우하단 행동 버튼
    const actions = el('div', 'actions');
    this.attackBtn = el('button', 'act attack') as HTMLButtonElement;
    this.attackIcon = el('span', 'ico', ICONS.sword);
    this.attackLabel = el('span', 'lbl', '공격');
    this.attackBtn.append(this.attackIcon, this.attackLabel);
    this.attackBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.attackBtn.setPointerCapture(e.pointerId);
      input.attackButtonHeld = true;
      input.press('attack');
      this.attackBtn.classList.add('down');
      this.onPress();
    });
    const release = () => {
      input.attackButtonHeld = false;
      this.attackBtn.classList.remove('down');
    };
    this.attackBtn.addEventListener('pointerup', release);
    this.attackBtn.addEventListener('pointercancel', release);

    // 상호작용 버튼: 대화·채집·입장 등 (공격 버튼과 따로 둔다)
    this.interactBtn = this.button('act interact-btn hidden', mico('glove', ICONS.hand), 'interact');
    this.interactLabel = el('span', 'lbl');
    this.interactBtn.appendChild(this.interactLabel);

    const dodge = this.button('act dodge', mico('boot', ICONS.dodge), 'dodge');
    this.dodgeBtn = dodge;
    this.dodgeShade = el('div', 'cooldown');
    dodge.appendChild(this.dodgeShade);
    this.dodgeCount = el('span', 'dodge-count hidden');
    dodge.appendChild(this.dodgeCount);

    for (let i = 0; i < 3; i++) {
      const b = this.button(`act skill s${i + 1}`, '', `skill${i + 1}` as Action);
      const label = el('span', 'skill-name');
      const shade = el('div', 'cooldown');
      b.append(label, shade);
      this.skillBtns.push(b);
      this.skillLabels.push(label);
      this.skillShades.push(shade);
    }
    // 궁극기 칸: 수호자를 쓰러뜨려 얻는다. 잠겨 있으면 얻는 방법을 알려 준다
    const ult = el('button', 'act skill ult locked') as HTMLButtonElement;
    this.ultBtn = ult;
    this.ultIcon = document.createElement('img');
    this.ultIcon.className = 'skill-icon';
    this.ultIcon.alt = '';
    this.ultIcon.style.display = 'none';
    this.ultLabel = el('span', 'skill-name', '궁극기');
    this.ultShade = el('div', 'cooldown');
    this.ultSec = el('span', 'cd-sec');
    ult.append(this.ultIcon, this.ultLabel, this.ultShade, this.ultSec);
    ult.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.ultLockedMsg) this.toast(this.ultLockedMsg, 2600);
      else {
        try {
          ult.setPointerCapture(e.pointerId);
        } catch {
          /* 캡처가 안 되는 브라우저 */
        }
        input.press('ult');
        input.holdButton('ult', true);
        this.onPress();
      }
    });
    const ultUp = () => input.holdButton('ult', false);
    ult.addEventListener('pointerup', ultUp);
    ult.addEventListener('pointercancel', ultUp);
    this.potionBtn = this.button('act potion', itemIconUrl('potion') ? `<img class="mico" src="${itemIconUrl('potion')}" alt="">` : ICONS.potion, 'potion');
    this.potionCount = el('span', 'badge');
    this.potionBtn.appendChild(this.potionCount);
    actions.append(this.attackBtn, this.interactBtn, dodge, ...this.skillBtns, ult, this.potionBtn);
    this.root.appendChild(actions);
    // 모바일 버튼 배치 편집 대상
    this.layoutTargets = { attack: this.attackBtn, interact: this.interactBtn, dodge, s1: this.skillBtns[0], s2: this.skillBtns[1], s3: this.skillBtns[2], ult, potion: this.potionBtn };
    this.applyLayout(input.controls.layout);

    this.bigMapEl = el('div', 'bigmap-wrap hidden');
    this.bigMapEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.press('map');
    });
    this.root.appendChild(this.bigMapEl);

    // 마을 상단: 보스 재등장·채집 맵 대기 시간 (접었다 펼 수 있음)
    this.timersEl = el('div', 'timers hidden');
    this.timersEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.timersOpen = !this.timersOpen;
      this.onTimersToggle?.(this.timersOpen);
      this.renderTimers();
    });
    this.root.appendChild(this.timersEl);

    this.toastEl = el('div', 'toast');
    this.root.appendChild(this.toastEl);
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private layoutTargets: Record<string, HTMLElement> = {};
  private layoutEdit: { layout: Record<string, { dx: number; dy: number; scale: number }>; sel: string; bar: HTMLDivElement; cleanup: () => void } | null = null;

  /** 모바일 버튼 배치 (옮긴 거리·크기) 적용 */
  applyLayout(layout: Record<string, { dx: number; dy: number; scale: number }>): void {
    for (const [id, elx] of Object.entries(this.layoutTargets)) {
      const l = layout[id];
      elx.style.translate = l ? `${l.dx}px ${l.dy}px` : '';
      elx.style.scale = l && l.scale !== 1 ? String(l.scale) : '';
    }
  }

  get editingLayout(): boolean {
    return !!this.layoutEdit;
  }

  /** 버튼 배치 편집: 끌어서 옮기고, 고른 버튼의 크기를 막대로 바꾼다. 끝나면 onDone(새 배치) */
  editLayout(start: Record<string, { dx: number; dy: number; scale: number }>, onDone: (layout: Record<string, { dx: number; dy: number; scale: number }>) => void): void {
    const layout: Record<string, { dx: number; dy: number; scale: number }> = JSON.parse(JSON.stringify(start));
    this.root.classList.add('layout-edit');
    // 편집 중에는 숨은 버튼(상호작용)도 보이게
    this.interactBtn.classList.add('edit-show');
    const bar = el('div', 'layout-bar');
    bar.innerHTML = `<b>버튼 배치 편집</b><span class="dim">버튼을 끌어서 옮기세요</span>
      <label>크기 <input type="range" min="60" max="170" step="5" value="100" data-ls></label><b data-lsv>100%</b>
      <button data-lreset>초기화</button><button class="primary" data-ldone>완료</button>`;
    this.root.appendChild(bar);
    const slider = bar.querySelector<HTMLInputElement>('[data-ls]')!;
    const sv = bar.querySelector<HTMLElement>('[data-lsv]')!;
    const select = (id: string) => {
      if (!this.layoutEdit) return;
      this.layoutEdit.sel = id;
      for (const [k, e] of Object.entries(this.layoutTargets)) e.classList.toggle('layout-sel', k === id);
      const sc = Math.round((layout[id]?.scale ?? 1) * 100);
      slider.value = String(sc);
      sv.textContent = `${sc}%`;
    };
    const handlers: [HTMLElement, (e: PointerEvent) => void][] = [];
    for (const [id, target] of Object.entries(this.layoutTargets)) {
      const down = (e: PointerEvent) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        select(id);
        const l = (layout[id] ??= { dx: 0, dy: 0, scale: 1 });
        const sx = e.clientX - l.dx;
        const sy = e.clientY - l.dy;
        const move = (ev: PointerEvent) => {
          l.dx = Math.round(ev.clientX - sx);
          l.dy = Math.round(ev.clientY - sy);
          this.applyLayout(layout);
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };
      target.addEventListener('pointerdown', down, true);
      handlers.push([target, down]);
    }
    slider.addEventListener('input', () => {
      const id = this.layoutEdit?.sel;
      if (!id) return;
      const l = (layout[id] ??= { dx: 0, dy: 0, scale: 1 });
      l.scale = Number(slider.value) / 100;
      sv.textContent = `${slider.value}%`;
      this.applyLayout(layout);
    });
    bar.addEventListener('pointerdown', (e) => e.stopPropagation());
    bar.querySelector('[data-lreset]')!.addEventListener('click', () => {
      for (const k of Object.keys(layout)) delete layout[k];
      this.applyLayout(layout);
      select(this.layoutEdit?.sel ?? 'attack');
    });
    const cleanup = () => {
      for (const [t, h] of handlers) t.removeEventListener('pointerdown', h, true);
      for (const e of Object.values(this.layoutTargets)) e.classList.remove('layout-sel');
      this.interactBtn.classList.remove('edit-show');
      this.root.classList.remove('layout-edit');
      bar.remove();
      this.layoutEdit = null;
    };
    bar.querySelector('[data-ldone]')!.addEventListener('click', () => {
      cleanup();
      onDone(layout);
    });
    this.layoutEdit = { layout, sel: 'attack', bar, cleanup };
    select('attack');
  }

  private button(className: string, icon: string, action: Action): HTMLButtonElement {
    const b = el('button', className, icon) as HTMLButtonElement;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // 꾹 누르는 스킬(집중형 각성): 손가락이 버튼 밖으로 나가도 뗄 때까지 누른 것으로
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처가 안 되는 브라우저 */
      }
      this.input.press(action);
      this.input.holdButton(action, true);
      b.classList.add('down');
      this.onPress();
    });
    const up = () => {
      b.classList.remove('down');
      this.input.holdButton(action, false);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', () => b.classList.remove('down'));
    b.addEventListener('pointercancel', up);
    return b;
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
    if (!v) {
      this.joystick.reset();
      this.input.attackButtonHeld = false;
    }
  }

  /** 장소에 따라 보이는 버튼이 다르다 */
  setMode(mode: HudMode): void {
    this.root.dataset.mode = mode;
  }

  private warpBtn!: HTMLButtonElement;
  setWarpButton(on: boolean): void {
    this.warpBtn.classList.toggle('hidden', !on);
  }

  setBuilding(on: boolean): void {
    this.root.classList.toggle('building', on);
  }

  /** 왼쪽 위 캐릭터 상반신 (장비가 바뀌면 다시 그린다). 이미지를 못 만들면 직업 글자 */
  setPortrait(url: string, short: string): void {
    if (!url) {
      this.portrait.textContent = short;
      return;
    }
    let img = this.portrait.querySelector('img');
    if (!img) {
      this.portrait.textContent = '';
      img = document.createElement('img');
      img.alt = '';
      const badge = el('span', 'lv-badge');
      this.portrait.append(img, badge);
    }
    if (img.dataset.src !== url) {
      img.dataset.src = url;
      img.src = url;
    }
  }

  setClass(short: string, color: string, skillNames: string[], cls?: ClassId): void {
    // 공격 버튼: 직업 무기 3D 아이콘
    const w = cls ? weaponIconUrl(cls) : '';
    if (w) this.attackIcon.innerHTML = `<img class="mico" src="${w}" alt="">`;
    if (!this.portrait.querySelector('img')) this.portrait.textContent = short;
    this.portrait.style.background = `linear-gradient(160deg, ${color}, #1c2240)`;
    skillNames.slice(0, this.skillLabels.length).forEach((n, i) => (this.skillLabels[i].textContent = n));
  }

  setBars(hp: number, maxHp: number, mp: number, maxMp: number, exp: number, expMax: number, level: number): void {
    const lb = this.portrait.querySelector('.lv-badge');
    if (lb && lb.textContent !== `Lv.${level}`) lb.textContent = `Lv.${level}`;
    const key = `${Math.ceil(hp)}|${maxHp}|${Math.floor(mp)}|${maxMp}|${exp}|${expMax}|${level}`;
    if (key === this.lastBars) return;
    this.lastBars = key;
    this.hpFill.style.width = `${(hp / maxHp) * 100}%`;
    this.hpText.textContent = `${Math.ceil(hp)} / ${maxHp}`;
    this.mpFill.style.width = `${(mp / maxMp) * 100}%`;
    this.mpText.textContent = `${Math.floor(mp)} / ${maxMp}`;
    this.expFill.style.width = `${Math.min(100, (exp / expMax) * 100)}%`;
    this.lvText.textContent = `Lv.${level}`;
    this.hpFill.parentElement!.classList.toggle('low', hp / maxHp < 0.3);
  }

  setGold(n: number): void {
    this.goldEl.textContent = `${n.toLocaleString()} G`;
  }

  setLocation(text: string, color: number): void {
    const html = `<i style="background:#${color.toString(16).padStart(6, '0')}"></i>${richText(text)}`;
    if (this.locationEl.innerHTML !== html) this.locationEl.innerHTML = html;
  }

  private bossTagEls: HTMLDivElement[] = [];
  /** 보스가 여럿일 때 (보스 러시) 머리 위 체력: 지금 줄 채움과 남은 줄 수 ×N */
  setBossTags(list: { x: number; y: number; name: string; ratio: number; bars: number; shielded: boolean }[]): void {
    const COLORS = ['#ff5a4a', '#ff9a3a', '#ffd23a', '#7aff9a', '#5ac8ff', '#a07aff', '#ff6ad0'];
    while (this.bossTagEls.length < list.length) {
      const d = el('div', 'boss-tag', '<span class="n"></span><div class="row"><b class="x"></b><div class="track"><div class="fill"></div></div></div>');
      this.labelLayer.appendChild(d);
      this.bossTagEls.push(d);
    }
    this.bossTagEls.forEach((d, i) => {
      const b = list[i];
      d.style.display = b ? '' : 'none';
      if (!b) return;
      const total = Math.max(0, b.ratio) * b.bars;
      const left = Math.ceil(total - 1e-6);
      const cur = left > 0 ? total - (left - 1) : 0;
      d.style.transform = `translate(${b.x}px, ${b.y}px) translate(-50%, -100%)`;
      (d.querySelector('.n') as HTMLElement).textContent = b.name;
      (d.querySelector('.x') as HTMLElement).textContent = `×${left}`;
      const fill = d.querySelector('.fill') as HTMLElement;
      fill.style.width = `${cur * 100}%`;
      fill.style.background = COLORS[(left - 1 + COLORS.length) % COLORS.length];
      (d.querySelector('.track') as HTMLElement).style.background = left > 1 ? COLORS[(left - 2 + COLORS.length) % COLORS.length] + '55' : 'rgba(0,0,0,0.6)';
      d.classList.toggle('shielded', b.shielded);
    });
  }

  private waveEl: HTMLDivElement | null = null;
  /** 웨이브 표시 (무한의 탑): 화면 위 가운데. null이면 숨김 */
  setWave(cur: number, total: number, cleared = false, hide = false): void {
    if (!this.waveEl) {
      this.waveEl = el('div', 'wave-bar hidden');
      this.root.appendChild(this.waveEl);
    }
    this.waveEl.classList.toggle('hidden', hide);
    this.root.classList.toggle('has-wave', !hide);
    if (hide) return;
    const dots = Array.from({ length: total }, (_, i) => `<em class="${i < cur - 1 || cleared ? 'done' : i === cur - 1 ? 'now' : ''}">${i + 1}</em>`).join('');
    const html = `<b>${cleared ? 'CLEAR' : `WAVE ${cur}`}</b><div class="wave-dots">${dots}</div>`;
    if (this.waveEl.innerHTML !== html) this.waveEl.innerHTML = html;
    this.waveEl.classList.toggle('clear', cleared);
  }

  private buffEl!: HTMLDivElement;
  /** 걸려 있는 버프 표시 */
  setBuffs(list: { text: string; bad?: boolean }[]): void {
    const html = list.map((t) => `<span class="${t.bad ? 'bad' : ''}">${t.text}</span>`).join('');
    if (this.buffEl.innerHTML !== html) this.buffEl.innerHTML = html;
  }

  private logEl!: HTMLDivElement;
  private logLines: { html: string; at: number }[] = [];
  private logTimer = 0;
  /** 획득 로그 한 줄 (최근 5줄, 8초 뒤 흐려지며 사라진다) */
  private logBtn!: HTMLButtonElement;
  private logPanel!: HTMLDivElement;
  /** 지난 로그 (최대 200줄) */
  private logHistory: { html: string; time: string }[] = [];
  toggleLogPanel(open = this.logPanel.classList.contains('hidden')): void {
    this.logPanel.classList.toggle('hidden', !open);
    if (!open) return;
    const rows = this.logHistory.map((l) => `<div><small>${l.time}</small> ${l.html}</div>`).join('') || '<div class="dim">아직 기록이 없습니다</div>';
    this.logPanel.innerHTML = `<div class="log-head"><b>지난 기록</b><small>${this.logHistory.length}줄</small><button class="log-x">✕</button></div><div class="log-body">${rows}</div>`;
    this.logPanel.querySelector('.log-x')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.toggleLogPanel(false);
    });
    const body = this.logPanel.querySelector<HTMLElement>('.log-body')!;
    body.scrollTop = body.scrollHeight;
  }
  log(html: string): void {
    const d = new Date();
    this.logHistory.push({ html, time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}` });
    if (this.logHistory.length > 200) this.logHistory.shift();
    if (!this.logPanel.classList.contains('hidden')) {
      const body = this.logPanel.querySelector<HTMLElement>('.log-body');
      const atEnd = body ? body.scrollHeight - body.scrollTop - body.clientHeight < 30 : true;
      this.toggleLogPanel(true);
      const nb = this.logPanel.querySelector<HTMLElement>('.log-body');
      if (nb && !atEnd && body) nb.scrollTop = body.scrollTop;
    }
    this.logLines.push({ html, at: performance.now() });
    if (this.logLines.length > 5) this.logLines.shift();
    this.renderLog();
    window.clearTimeout(this.logTimer);
    this.logTimer = window.setTimeout(() => this.renderLog(), 1000);
  }
  private renderLog(): void {
    const now = performance.now();
    this.logLines = this.logLines.filter((l) => now - l.at < 9000);
    this.logEl.innerHTML = this.logLines.map((l) => `<div class="${now - l.at > 7000 ? 'old' : ''}">${l.html}</div>`).join('');
    if (this.logLines.length) this.logTimer = window.setTimeout(() => this.renderLog(), 1000);
  }
  clearLog(): void {
    this.logLines = [];
    this.logEl.innerHTML = '';
  }

  /** 퀘스트 알림판 접힘 (눌러서 접고 편다) */
  objectiveOpen = true;
  onObjectiveToggle?: (open: boolean) => void;
  private objectiveText = '';

  setObjective(text: string): void {
    this.objectiveText = text;
    const lines = text ? text.split('\n') : [];
    const body = lines.map((l, i) => (i === 0 ? `▶ ${l}` : `· ${l}`)).join('\n');
    const t = `${this.objectiveOpen ? 1 : 0}|${body}`;
    if (this.objectiveEl.dataset.t !== t) {
      this.objectiveEl.dataset.t = t;
      this.objectiveEl.innerHTML = `<span class="obj-head">퀘스트 ${this.objectiveOpen ? '▴' : `▾ <small>${lines.length}</small>`}</span>${this.objectiveOpen ? `<div class="obj-body">${richText(body)}</div>` : ''}`;
    }
    this.objectiveEl.classList.toggle('hidden', !text);
    this.objectiveEl.classList.toggle('closed', !this.objectiveOpen);
  }

  /** 레이드 보스 체력: 여러 줄. 지금 줄은 앞에, 다음 줄 색이 뒤에 깔린다 */
  setBoss(name: string | null, ratio = 1, bars = 1, shielded = false, hurry = false): void {
    this.bossEl.classList.toggle('hidden', !name);
    if (!name) return;
    const COLORS = ['#ff5a4a', '#ff9a3a', '#ffd23a', '#7aff9a', '#5ac8ff', '#a07aff', '#ff6ad0'];
    const total = Math.max(0, ratio) * bars;
    const left = Math.ceil(total - 1e-6);
    const cur = left > 0 ? total - (left - 1) : 0;
    if (this.bossName.dataset.t !== name) {
      this.bossName.dataset.t = name;
      this.bossName.innerHTML = richText(name);
    }
    this.bossFill.style.width = `${cur * 100}%`;
    this.bossFill.style.background = COLORS[(left - 1 + COLORS.length) % COLORS.length];
    const track = this.bossFill.parentElement!;
    track.style.background = left > 1 ? COLORS[(left - 2 + COLORS.length) % COLORS.length] + '66' : 'rgba(0,0,0,0.6)';
    track.dataset.bars = bars > 1 ? `×${left}` : '';
    this.bossEl.classList.toggle('shielded', shielded);
    this.bossEl.classList.toggle('hurry', hurry);
  }

  setMinimap(canvas: HTMLCanvasElement | null): void {
    this.minimapSlot.replaceChildren(...(canvas ? [canvas] : []));
  }

  /** 채집 버튼을 꾹 누르는 정도 (0~1, 자동 채집까지). 음수면 끈다 */
  setInteractCharge(k: number): void {
    this.interactBtn.classList.toggle('charging', k >= 0);
    if (k >= 0) this.interactBtn.style.setProperty('--charge', `${Math.round(Math.min(1, k) * 360)}deg`);
  }

  /** 가까이에 상호작용할 대상이 있으면 상호작용 버튼이 나타난다 (공격 버튼은 그대로) */
  setInteract(label: string | null): void {
    if (label === this.lastInteract) return;
    this.lastInteract = label;
    // 상호작용할 때는 공격 버튼 자리에 상호작용 버튼이 나온다
    this.interactBtn.classList.toggle('hidden', label === null);
    this.attackBtn.classList.toggle('hidden', label !== null);
    if (label) {
      this.interactLabel.textContent = label;
      this.input.attackButtonHeld = false;
      this.attackBtn.classList.remove('down');
    }
    void this.attackIcon;
    void this.attackLabel;
  }

  showBigMap(canvas: HTMLCanvasElement | null): void {
    this.bigMapEl.classList.toggle('hidden', !canvas);
    this.bigMapEl.replaceChildren(...(canvas ? [canvas, Object.assign(el('div', 'bigmap-hint'), { textContent: 'M 또는 화면을 눌러 닫기' })] : []));
  }

  /** 생산 중인 기계 위의 아이콘. 누르면 정보 창 */
  setBubbles(list: { x: number; y: number; icon: string; progress: number; onClick: () => void }[]): void {
    while (this.bubblePool.length < list.length) {
      const b = el('button', 'prod-bubble') as HTMLButtonElement;
      b.innerHTML = '<img alt=""><span class="bar"><span></span></span>';
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        (b as unknown as { cb?: () => void }).cb?.();
      });
      this.bubbleLayer.appendChild(b);
      this.bubblePool.push(b);
    }
    this.bubblePool.forEach((b, i) => {
      const d = list[i];
      if (!d) {
        b.style.display = 'none';
        return;
      }
      b.style.display = '';
      (b as unknown as { cb?: () => void }).cb = d.onClick;
      b.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -100%)`;
      const img = b.firstElementChild as HTMLImageElement;
      if (img.dataset.src !== d.icon) {
        img.dataset.src = d.icon;
        img.src = d.icon;
      }
      (b.querySelector('.bar span') as HTMLElement).style.width = `${Math.round(d.progress * 100)}%`;
    });
  }

  private dodgeKey = '';
  private dodgeBtn: HTMLButtonElement | null = null;
  /** 회피 버튼 모양: 직업마다 (구르기·블링크·후방 도약) */
  setDodgeIcon(url: string | null, label: string): void {
    const key = `${url}|${label}`;
    if (key === this.dodgeKey || !this.dodgeBtn) return;
    this.dodgeKey = key;
    this.dodgeBtn.querySelector('.dodge-art')?.remove();
    if (url) {
      const art = el('div', 'dodge-art', `<img src="${url}" alt=""><span class="lbl">${label}</span>`);
      this.dodgeBtn.prepend(art);
    }
    this.dodgeBtn.classList.toggle('custom', !!url);
  }

  private dodgeCount!: HTMLSpanElement;
  /** 회피 재사용 대기. charges ≥ 0 이면 남은 충전 수를 작은 숫자로 */
  setDodgeCooldown(ratio: number, charges = -1): void {
    this.dodgeShade.style.transform = `scaleY(${ratio})`;
    this.dodgeCount.classList.toggle('hidden', charges < 0);
    const t = String(charges);
    if (charges >= 0 && this.dodgeCount.textContent !== t) this.dodgeCount.textContent = t;
  }

  private ultBtn!: HTMLButtonElement;
  private ultIcon!: HTMLImageElement;
  private ultLabel!: HTMLSpanElement;
  private ultShade!: HTMLDivElement;
  private ultSec!: HTMLSpanElement;
  private ultLockedMsg = '';
  private ultCdWas = false;

  /** 궁극기 칸. lockedMsg가 있으면 잠김 */
  private ultStockEl: HTMLSpanElement | null = null;
  setUlt(o: { name: string; icon: string; ratio: number; secs: number; ready: boolean; lockedMsg?: string; stock?: number; charge?: number }): void {
    this.ultLockedMsg = o.lockedMsg ?? '';
    const b = this.ultBtn;
    if (!this.ultStockEl) {
      this.ultStockEl = el('span', 'dodge-count hidden');
      b.appendChild(this.ultStockEl);
    }
    const sv = o.stock ?? -1;
    this.ultStockEl.classList.toggle('hidden', sv < 0);
    if (sv >= 0 && this.ultStockEl.textContent !== String(sv)) this.ultStockEl.textContent = String(sv);
    const ch = o.charge ?? -1;
    b.classList.toggle('charging', ch >= 0);
    b.classList.toggle('charged', ch >= 0.99);
    if (ch >= 0) b.style.setProperty('--charge', `${Math.round(ch * 360)}deg`);
    b.classList.toggle('locked', !!o.lockedMsg);
    const cooling = o.ratio > 0.001;
    b.classList.toggle('cooling', cooling);
    b.classList.toggle('no-mp', !o.ready);
    if (this.ultCdWas && !cooling) {
      b.classList.remove('ready-flash');
      void b.offsetWidth;
      b.classList.add('ready-flash');
    }
    this.ultCdWas = cooling;
    this.ultShade.style.transform = `scaleY(${Math.min(1, o.ratio)})`;
    const sec = cooling ? String(Math.ceil(o.secs)) : '';
    if (this.ultSec.textContent !== sec) this.ultSec.textContent = sec;
    if (this.ultLabel.textContent !== o.name) this.ultLabel.textContent = o.name;
    if (this.ultIcon.dataset.src !== o.icon) {
      this.ultIcon.dataset.src = o.icon;
      if (o.icon) this.ultIcon.src = o.icon;
      this.ultIcon.style.display = o.icon ? '' : 'none';
    }
  }

  /** 퀵슬롯 3칸. names[i]가 null이면 빈 칸 */
  private skillCdWas: boolean[] = [];
  private skillIcons: (HTMLImageElement | null)[] = [];
  private skillSecs: (HTMLSpanElement | null)[] = [];
  /**
   * 퀵슬롯 3칸. names[i]가 null이면 빈 칸.
   * 재사용 대기 중에는 빨간 그늘 + 남은 초, 다시 쓸 수 있게 되면 한 번 번쩍인다
   */
  private skillStocks: HTMLSpanElement[] = [];
  /** stocks: 충전형 각성이면 남은 충전 수 (아니면 -1). charging: 집중형으로 모으는 중인 칸과 정도 */
  setSkills(cooldowns: number[], ready: boolean[], names: (string | null)[], icons: string[] = [], secs: number[] = [], stocks: number[] = [], charging: { slot: number; k: number } | null = null): void {
    cooldowns.forEach((r, i) => {
      const btn = this.skillBtns[i];
      let st = this.skillStocks[i];
      if (!st) {
        st = el('span', 'dodge-count hidden');
        btn.appendChild(st);
        this.skillStocks[i] = st;
      }
      const sv = stocks[i] ?? -1;
      st.classList.toggle('hidden', sv < 0);
      if (sv >= 0 && st.textContent !== String(sv)) st.textContent = String(sv);
      const ch = charging && charging.slot === i ? charging.k : -1;
      btn.classList.toggle('charging', ch >= 0);
      btn.classList.toggle('charged', ch >= 0.99);
      if (ch >= 0) btn.style.setProperty('--charge', `${Math.round(ch * 360)}deg`);
      const cooling = r > 0.001;
      this.skillShades[i].style.transform = `scaleY(${Math.min(1, r)})`;
      btn.classList.toggle('cooling', cooling);
      if (this.skillCdWas[i] && !cooling) {
        btn.classList.remove('ready-flash');
        void btn.offsetWidth;
        btn.classList.add('ready-flash');
      }
      this.skillCdWas[i] = cooling;
      btn.classList.toggle('no-mp', !ready[i]);
      btn.classList.toggle('locked', names[i] === null);
      const label = names[i] ?? '비어 있음';
      if (this.skillLabels[i].textContent !== label) this.skillLabels[i].textContent = label;
      // 3D 아이콘
      let img = this.skillIcons[i];
      if (!img) {
        img = document.createElement('img');
        img.className = 'skill-icon';
        img.alt = '';
        btn.insertBefore(img, btn.firstChild);
        this.skillIcons[i] = img;
      }
      const url = icons[i] ?? '';
      if (img.dataset.src !== url) {
        img.dataset.src = url;
        if (url) img.src = url;
        img.style.display = url ? '' : 'none';
      }
      let sec = this.skillSecs[i];
      if (!sec) {
        sec = document.createElement('span');
        sec.className = 'cd-sec';
        btn.appendChild(sec);
        this.skillSecs[i] = sec;
      }
      const t = cooling && secs[i] ? String(Math.ceil(secs[i])) : '';
      if (sec.textContent !== t) sec.textContent = t;
    });
  }

  private potionShade: HTMLDivElement | null = null;
  setPotions(n: number, cooldown = 0): void {
    this.potionCount.textContent = String(n);
    this.potionBtn.classList.toggle('empty', n === 0);
    if (!this.potionShade) {
      this.potionShade = el('div', 'cooldown') as HTMLDivElement;
      this.potionBtn.appendChild(this.potionShade);
    }
    this.potionShade.style.transform = `scaleY(${Math.min(1, Math.max(0, cooldown))})`;
  }

  setBagCount(used: number, total: number): void {
    this.bagCount.textContent = `${used}/${total}`;
    this.bagCount.classList.toggle('full', used >= total);
  }

  /** 머리 위 이름표 */
  setLabels(labels: { text: string; x: number; y: number; accent?: boolean; self?: boolean }[]): void {
    while (this.labelPool.length < labels.length) {
      const l = el('div', 'name-label');
      this.labelLayer.appendChild(l);
      this.labelPool.push(l);
    }
    this.labelPool.forEach((l, i) => {
      const d = labels[i];
      if (!d) {
        l.style.display = 'none';
        return;
      }
      l.style.display = '';
      if (l.dataset.t !== d.text) {
        l.dataset.t = d.text;
        l.innerHTML = richText(d.text);
      }
      l.classList.toggle('accent', !!d.accent);
      l.classList.toggle('self', !!d.self);
      l.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -100%)`;
    });
  }

  private timersEl: HTMLDivElement;
  private timerChips: string[] | null = null;
  timersOpen = true;
  onTimersToggle: ((open: boolean) => void) | null = null;

  /** 대기 시간 칩 목록. null이면 숨긴다 */
  setTimers(chips: string[] | null): void {
    if (JSON.stringify(chips) === JSON.stringify(this.timerChips)) return;
    this.timerChips = chips;
    this.renderTimers();
  }

  private renderTimers(): void {
    const chips = this.timerChips;
    this.timersEl.classList.toggle('hidden', !chips);
    if (!chips) return;
    this.timersEl.classList.toggle('open', this.timersOpen);
    this.timersEl.innerHTML = `<span class="t-head">${richText(':hourglass:')} 타이머 ${this.timersOpen ? '▴' : '▾'}</span>${this.timersOpen ? chips.map((c) => `<span class="t-chip">${c}</span>`).join('') : ''}`;
  }

  toast(text: string, ms = 1800): void {
    this.toastEl.innerHTML = richText(text);
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  /** 떠오르는 숫자: 세계에 고정 (카메라가 움직이면 같이 밀린다). dir: 날아갈 화면 방향 (공격한 쪽의 반대) */
  private floats: { el: HTMLDivElement; x: number; y: number; t: number; dx: number; dy: number; big: number }[] = [];

  floatText(x: number, y: number, text: string, color: string, kind: 'normal' | 'crit' | 'hurt' | 'small' = 'normal', dir?: { x: number; y: number }): void {
    if (this.floats.length > 40) this.floats.shift()!.el.remove();
    const f = el('div', `float-text ${kind}`);
    f.textContent = text;
    f.style.color = color;
    const len = dir ? Math.hypot(dir.x, dir.y) : 0;
    // 방향이 없으면 위로, 있으면 그 방향 (조금 위로 치우치게)
    const dx = len > 0.001 ? dir!.x / len : (Math.random() - 0.5) * 0.4;
    const dy = len > 0.001 ? dir!.y / len - 0.35 : -1;
    const n = Math.hypot(dx, dy) || 1;
    this.floats.push({ el: f, x: x + (Math.random() - 0.5) * 16, y, t: 0, dx: dx / n, dy: dy / n, big: kind === 'small' ? 2 : 3 });
    this.floatLayer.appendChild(f);
    this.tickFloats(0, 0, 0);
  }

  /** 매 프레임: 등장(3배 → 1배, 0.15초) → 잠깐 머묾 → 공격 반대쪽으로 밀려나며 사라짐. shift: 카메라 이동으로 밀린 화면 거리 */
  tickFloats(dt: number, shiftX: number, shiftY: number): void {
    const POP = 0.15;
    const HOLD = 0.35;
    const END = 0.95;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      f.x += shiftX;
      f.y += shiftY;
      if (f.t >= END) {
        f.el.remove();
        this.floats.splice(i, 1);
        continue;
      }
      let scale = 1;
      if (f.t < POP) {
        const k = f.t / POP;
        scale = f.big - (f.big - 1) * (1 - (1 - k) * (1 - k));
      }
      let off = 0;
      let alpha = 1;
      if (f.t > HOLD) {
        const k = (f.t - HOLD) / (END - HOLD);
        off = 46 * (1 - (1 - k) * (1 - k));
        alpha = 1 - k * k;
      }
      f.el.style.transform = `translate(${(f.x + f.dx * off).toFixed(1)}px, ${(f.y + f.dy * off).toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      f.el.style.opacity = alpha.toFixed(3);
    }
  }

}
