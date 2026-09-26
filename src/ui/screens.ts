import { BUILD_ID, GAME_VERSION } from '../config';
import { BIND_LIST, defaultControls, keyLabel, type Bindable, type Controls } from '../core/controls';
import { cleanNickname, fetchBoard, NICK_MAX, submitTrial } from '../core/leaderboard';
import { encyclopediaPages } from './encyclopedia';
import { SCRIPTS, STORY_REPLAY, type Step } from '../data/story';
import { FEEDBACK_KINDS, FEEDBACK_MAX, FEEDBACK_NAME_MAX, feedbackWait, savedFeedbackName, sendFeedback, type FeedbackInfo } from '../core/feedback';
import { PATCH_NOTES } from '../data/patchnotes';
import { applyUpdate, fetchRemoteVersion, isNewer, type RemoteVersion } from './update';
import { CLASSES, CLASS_ORDER, expToNext, MAX_LEVEL, MAX_SKILL_LEVEL, SKILL_LEARN, skillUpgradeCost, STAT_INFO, STAT_KEYS, MAX_ULT_LEVEL, ultCooldown, ultPower, ULTIMATES, type ClassId, type StatKey } from '../data/classes';
import { ultUpgradeCost } from '../data/ultUpgrade';
import { TOOL_KIND_NAMES, TOOL_TIER_NAMES, toolBonusChance, toolEnhanceCost, toolMaxDur, toolName, toolRepair, toolSpeed, type ToolKind, type ToolState } from '../data/tools';
import { equipCraftCost, equipManaCraftCost, MANA_PLATE_OF, manaPlateCraftCost, plateCraftCost, toolCraftCost, workbenchUpgradeCost, type CraftCost } from '../data/crafting';
import { durability, EQUIP_SLOTS, SERIES, seriesBonus, EQUIP_MAX_DUR, enhanceCost, repairCost, type EquipSlot, equipName, equipStats, equipValue, GRADES, slotName, type Equip } from '../data/equipment';
import { PRODUCER_CAP, PRODUCER_LIMIT, PRODUCER_MAX_LEVEL, PRODUCER_TYPES, PRODUCER_UNLOCK, producerOutputs, producerTime, producerUpgradeCost, type ProducerType } from '../data/factory';
import { BUILDINGS, BUILD_ORDER, buildingUpgradeCost, ESSENCE_BOOST, ESSENCE_BURN, FACTORY_SIZES, generatorPower, levelSpeed, MAX_BUILDING_LEVEL, RECIPES, UPGRADABLE, upgradeBlueprintCost, type BuildingType } from '../data/factory';
import { ITEMS, ITEM_LIST, ORE_TIERS, TIER_PLATE, WOOD_TIERS } from '../data/items';
import { QUEST_BY_ID, type QuestDef } from '../data/quests';
import { THEMES } from '../data/themes';
import { equipFromToken, isEquipToken, canEnqueue, enqueueJob, WORKBENCH_OUT_MAX, WORKBENCH_QUEUE_MAX, BOX_CAPACITY, boxTotal, producerStock, producerTarget, ESSENCES, MACHINE_TYPES, RECIPE_BY_ID, recipesFor, type BuildingState, type Factory, type WorkJob } from '../factory/sim';
import type { Bag, Slot } from '../game/Bag';
import { CATCH_UP_EXP, ROSTER_STEP, PACT_AWAKEN_KILLS, PACT_KILLS, BAG_MAX_LEVEL, BAG_STEP, stageIndex, STORAGE_MAX_LEVEL, storageSlotsFor, STORE_STACK, warehouseSlots, type Progress } from '../game/Progress';
import { objectiveNeed, objectiveProgress, objectiveText, todayKey, type Quests } from '../game/Quests';
import { ICONS, mico, richText } from './icons';
import { buildingThumb } from './thumbs';
import { gearLook } from '../models/items';
import { equipIconUrl, heroPortraitUrl, itemIconUrl, monsterIconUrl, skillIconUrl, toolIconUrl } from './itemIcons';
import { awakenCost, effectTier, SKILL_AWAKEN, ULT_AWAKEN, type AwakenBranch, type AwakenDef } from '../data/awaken';
import { rollSpecials, specialRange, specialRerollCost, specialText } from '../data/special';
import { BESTIARY, BESTIARY_BY_ID, COLLECTION_MILESTONES, isStageMaster, killMilestones, MASTER_ALL_GAIN, milestoneReward, RESEARCH_BONUS, SPECIES_STAT_KILLS, statMilestone, type BestiaryReward } from '../data/bestiary';
import { BOSS_SPECIES, DEBUFF_INFO, TRAIT_TEXT, type Faction } from '../data/species';
import { BLESSINGS, BLESS_IDS, dayKey, HORDE_BOSS_EVERY, HORDE_MILESTONES, hordeDaily, RAID_HP, RAID_TIME, raidDayMarks, raidScoreText, raidSpec, trialDayMarks, VOW_IDS, VOWS, vowMult, type VowId } from '../data/endgame';
import { RAID_SPECIES, SPECIES } from '../data/species';
import { CH8_RULES, CH8_STAGES, CH8_THEME, ch8Mult } from '../data/chapter8';
import { endLock, AFFIXES, ALLOY, ALLOY2, RIFT_ALLOY2_FROM, riftEntry, rushEntry, formatClock, riftAffixes, riftMult, riftReward, RIFT_ALLOY, RIFT_TIME, rushReward, RUSH_DAILY, RUSH_DIFFS, RUSH_EXTRA_ALLOY, SHARD, DUST, DUST_PER_SHARD, END_NAMES, type EndContent, readTrialCode, trialCode, trialGrade, TRIAL_GRADES, TRIAL_HP, trialScoreText, trialSpec, TRIAL_TIME, weekKey, towerBoss, towerDaily, towerFirstClear, towerMult, rushFights, type RushDiff } from '../data/endgame';
import { BONUS_NAMES, bonusText, TRANSCEND_STATS, transcendCost, transcendExp, engraveCost, engraveRange, ENGRAVE_STAGES, ENGRAVE_STAGE_NAMES, rollEngrave, TITLES, type BonusKey } from '../data/bonus';
import { mathRng, Rng } from '../core/rng';
import { EXCHANGE, MARK } from '../data/marks';
import { ACHIEVEMENTS, type AchCtx } from '../data/achievements';
import { RELIC_BY_ID, RELIC_CRAFT_GOLD, RELIC_CRAFT_SHARDS, RELIC_GRADES, RELIC_MAX, RELIC_SLOTS, relicName, relicRange, rollRelic, type Relic } from '../data/relics';
import { rollClassSet, rollSetGrade, SET_PIECES, SET_TYPE_NAMES, SETS, setCraftCost, setsOf, type SetId } from '../data/sets';
import { newUid, withSpecials } from '../data/equipment';
import { TRIAL_RAGE, vaultPileGold, type Archetype } from '../data/monsters';

const FACTION_NAME: Record<Faction, string> = { beast: '야수', undead: '언데드', orc: '오크족', elf: '다크엘프', construct: '구조물', elemental: '정령', void: '공허', demon: '악마' };
const ARCH_NAME: Record<Archetype, string> = {
  melee: '근접',
  ranged: '원거리 마법',
  charger: '돌진',
  bomber: '자폭',
  tank: '거대',
  brute: '광전사',
  archer: '궁수',
  assassin: '암살자',
  necro: '소환술사',
  shaman: '치유사',
  caster: '마법사',
  swarm: '떼',
  spitter: '독 뱉기',
  knight: '방패병',
};
import { canInstall, promptInstall } from './install';

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface ResultInfo {
  title: string;
  items: Map<string, number>;
  equips: Equip[];
  lost?: Map<string, number>;
  lostEquips?: number;
  seconds: number;
  explored: number;
  gold: number;
  exp: number;
  stages?: number;
  note?: string;
}

/** 목록 안의 아이콘 (절대 위치) */
/** 글 속 작은 3D 아이콘 (그리기 실패 시 이모지) */
const SPK = (name: Parameters<typeof mico>[0], fallback: string) => mico(name, fallback, 'mico-inline');

/** 3D 모델로 그린 아이콘. 그리기에 실패하면 예전 보석 모양으로 */
const itemGem = (id: string) => {
  const url = itemIconUrl(id);
  return url ? `<img class="gem ico" src="${url}" alt="">` : `<span class="gem" style="--c:${hex(ITEMS[id]?.color ?? 0xffffff)}"></span>`;
};
const equipGem = (e: Equip) => {
  const url = equipIconUrl(e);
  return url ? `<img class="gem ico eq-ico" style="--c:${hex(GRADES[e.grade].color)}" src="${url}" alt="">` : `<span class="gem eq" style="--c:${hex(GRADES[e.grade].color)}"></span>`;
};
const toolGem = (k: ToolKind, t: ToolState) => {
  const url = toolIconUrl(k, t.tier);
  return url ? `<img class="gem ico" src="${url}" alt="">` : '';
};
/** 개수를 창고 칸(99개씩)으로 나눈다 */
const stacks = (n: number): number[] => {
  const out: number[] = [];
  for (let left = n; left > 0; left -= STORE_STACK) out.push(Math.min(STORE_STACK, left));
  return out;
};
/** 글 사이에 들어가는 작은 아이콘 */
const inlineGem = (id: string) => {
  const url = itemIconUrl(id);
  return url ? `<img class="gem-inline ico" src="${url}" alt="">` : `<i class="gem-inline" style="--c:${hex(ITEMS[id]?.color ?? 0xffffff)}"></i>`;
};

/** 남은 시간 글자: "1시간 20분", "42분", "30초" */
export function formatWait(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간${m ? ` ${m}분` : ''}`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

/** 제작대 작업 이름과 아이콘 (창·말풍선 공용) */
export function workJobName(j: WorkJob): string {
  if (j.kind === 'item') return ITEMS[j.id].name;
  if (j.kind === 'tool') return `${TOOL_TIER_NAMES[j.tier - 1]} ${TOOL_KIND_NAMES[j.id as ToolKind]}`;
  return `${j.mana ? `${SPK('sparkle', '✨')} ` : ''}${equipName(workJobEquip(j))}`;
}
export function workJobEquip(j: WorkJob): Equip {
  return { uid: '', slot: j.id as EquipSlot, cls: j.cls as ClassId | undefined, tier: j.tier, grade: 0, plus: 0 };
}
export function workJobIconUrl(j: WorkJob): string {
  if (j.kind === 'item') return itemIconUrl(j.id);
  if (j.kind === 'tool') return toolIconUrl(j.id as ToolKind, j.tier);
  return equipIconUrl(workJobEquip(j));
}
const workJobIcon = (j: WorkJob) => {
  const url = workJobIconUrl(j);
  return url ? `<img class="wb-ico" src="${url}" alt="">` : '';
};

/** 기본 능력치 한 줄 (공격·방어·HP·MP·치명). 망가졌으면 빈 문자열 */
function equipBase(e: Equip): string {
  const s = equipStats(e);
  const parts = [];
  if (s.atk) parts.push(`공격 ${s.atk}`);
  if (s.def) parts.push(`방어 ${s.def}`);
  if (s.hp) parts.push(`HP ${s.hp}`);
  if (s.mp) parts.push(`MP ${s.mp}`);
  if (s.crit) parts.push(`치명 ${s.crit}%`);
  return parts.join(' · ');
}

/** 목록용 요약: 기본 능력치 + 계열 · 각인 줄 수 · 특수 옵션 줄 수 */
export function equipLine(e: Equip): string {
  const base = equipBase(e);
  if (!base) return '';
  const tags = [base];
  if (e.set && SETS[e.set]) tags.push(`<span class="ser" style="color:${hex(SETS[e.set].color)}">◈${SETS[e.set].name}</span>`);
  if (e.series) tags.push(`<span class="ser" style="color:${hex(SERIES[e.series].color)}">${SERIES[e.series].name}</span>`);
  if (e.eng?.length) tags.push(`<span class="eng">각인 ${e.eng.length}</span>`);
  if (e.sp?.length) tags.push(`<span class="spo">◆특수 ${e.sp.length}</span>`);
  return tags.join(' · ');
}

/** 상세 보기: 기본 능력치 한 줄 + 옵션을 한 줄에 하나씩 */
export function equipDetail(e: Equip): string {
  const base = equipBase(e);
  if (!base) return '<span class="bad">망가짐 — 대장간에서 수리하세요</span>';
  const lines = [`<div class="opt-base">${base}</div>`];
  if (e.set && SETS[e.set]) {
    const st = SETS[e.set];
    lines.push(`<div class="opt ser" style="color:${hex(st.color)}">◈ ${CLASSES[st.cls].name} ${SET_TYPE_NAMES[st.type]} 세트 「${st.name}」 · ${CLASSES[st.cls].name} 전용</div>`);
    for (const t of st.tiers) lines.push(`<div class="opt ser" style="color:${hex(st.color)};opacity:.8">&nbsp;&nbsp;${t.n}세트: ${t.lines.map(specialText).join(', ')}</div>`);
  }
  if (e.series) {
    const sr = SERIES[e.series];
    for (const [k, v] of Object.entries(seriesBonus(e)) as [BonusKey, number][]) lines.push(`<div class="opt ser" style="color:${hex(sr.color)}">${sr.name} · ${bonusText(k, v)}</div>`);
  }
  (e.eng ?? []).forEach((l, i) => lines.push(`<div class="opt eng">각인 ${i + 1}단 · ${bonusText(l.k, l.v)}</div>`));
  for (const l of e.sp ?? []) lines.push(`<div class="opt spo">◆ ${specialText(l)}</div>`);
  return `<div class="opt-list">${lines.join('')}</div>`;
}

function equipTitle(e: Equip): string {
  return `<b style="color:${hex(GRADES[e.grade].color)}">[${GRADES[e.grade].name}] ${esc(equipName(e))}</b>`;
}

const KIND_NAMES = { material: '재료', essence: '마력 정수', processed: '가공품', consumable: '소모품', key: '중요 물품' };

/** 가방 칸의 정보 (이름, 종류, 설명) */
function slotInfo(s: Slot): string {
  if (s.equip) {
    const e = s.equip;
    return `${equipTitle(e)} <span class="dim">· ${slotName(e.slot, e.cls)}${e.cls ? ` (${CLASSES[e.cls].name} 전용)` : ''}</span>${equipDetail(e)}<small class="dim">판매가 ${equipValue(e)} G</small>`;
  }
  const it = ITEMS[s.itemId];
  return `<b style="color:${hex(it.color)}">${it.name}</b> <span class="dim">· ${KIND_NAMES[it.kind]} · ${s.count}개 · 개당 ${it.value} G</span><br>${it.description}`;
}

/** 모든 메뉴 화면. 한 번에 하나만 열린다 */
export class Screens {
  private layer: HTMLDivElement;
  private current: HTMLElement | null = null;
  private onCloseCb: (() => void) | null = null;

  constructor(
    parent: HTMLElement,
    private click: () => void,
  ) {
    this.layer = document.createElement('div');
    this.layer.className = 'screens';
    parent.appendChild(this.layer);
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  close(): void {
    // 꼭 끝내야 하는 창(닉네임 정하기)은 Esc 등으로 닫히지 않는다
    if (this.current?.dataset.locked) return;
    this.current?.remove();
    this.current = null;
    const cb = this.onCloseCb;
    this.onCloseCb = null;
    cb?.();
  }

  /** 이야기 다시 보기 (게임이 대화창으로 틀어 준다) */
  onReplay?: (steps: Step[], back: () => void) => void;

  private open(className: string, html: string, onClose?: () => void): HTMLElement {
    const scroll = this.current?.querySelector('.scroll')?.scrollTop ?? 0;
    const sameKind = this.current?.dataset.kind === className;
    this.current?.remove();
    this.onCloseCb = null;
    const s = document.createElement('div');
    s.className = `screen ${className}`;
    s.dataset.kind = className;
    if (sameKind) s.classList.add('no-anim');
    s.innerHTML = html;
    this.layer.appendChild(s);
    this.current = s;
    // 같은 화면을 다시 그릴 때는 스크롤 위치를 유지한다
    if (sameKind) {
      const sc = s.querySelector('.scroll');
      if (sc) sc.scrollTop = scroll;
    }
    if (onClose) {
      this.onCloseCb = onClose;
      s.querySelector('.close')?.addEventListener('click', () => this.close());
      // 바깥을 눌러 닫기: 열리자마자 들어온 터치(조이스틱·공격 버튼을 누르고 있던 손가락)는 무시하고,
      // 바깥에서 눌렀다 뗀 경우에만 닫는다. 예/아니오 창은 바깥을 눌러도 닫히지 않는다
      const openedAt = performance.now();
      let downOnBg = false;
      s.addEventListener('pointerdown', (e) => {
        downOnBg = e.target === s && performance.now() - openedAt > 400;
      });
      s.addEventListener('pointerup', (e) => {
        if (downOnBg && e.target === s && className !== 'ask' && className !== 'feedback' && className !== 'bless') this.close();
        downOnBg = false;
      });
    }
    s.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) this.click();
    });
    return s;
  }

  private on(s: HTMLElement, selector: string, f: (el: HTMLElement) => void): void {
    s.querySelectorAll<HTMLElement>(selector).forEach((el) => el.addEventListener('click', () => f(el)));
  }

  // ---------------- 타이틀 ----------------
  title(hasSave: boolean, onNew: () => void, onContinue: () => void, onLoadCode?: () => void, onTest?: () => void, onSaveCode?: () => void): void {
    const again = () => this.title(hasSave, onNew, onContinue, onLoadCode, onTest, onSaveCode);
    const s = this.open(
      'title',
      `<div class="title-box">
         <div class="title-sub">차원틈새에 떨어진 자의 이야기</div>
         <h1>영겁의 틈새</h1>
         <div class="title-menu">
           ${hasSave ? '<button class="primary" data-a="continue">이어하기</button>' : ''}
           <button class="${hasSave ? '' : 'primary'}" data-a="new">새로 시작</button>
           ${canInstall() ? `<button class="install" data-a="install">${SPK('phone', '📲')} 앱으로 설치</button>` : ''}
           ${hasSave && onSaveCode ? `<button class="update" data-a="savecode">${SPK('disk', '💾')} 저장 코드 만들기</button>` : ''}
           <button class="update" data-a="loadcode">${SPK('key', '📥')} 저장 코드로 불러오기</button>
           <button class="update" data-a="update">${SPK('refresh', '🔄')} 업데이트 확인</button>
           <button class="update" data-a="feedback">${SPK('scroll', '✉')} 의견 보내기</button>
         </div>
       </div>
       ${onTest ? '<div class="secret-spot" data-a="secret" aria-hidden="true"></div>' : ''}
       <button class="patch-btn" data-a="patch">${SPK('scroll', '📜')} 패치노트</button>
       <div class="version">v${GAME_VERSION} (${BUILD_ID}) · 모바일 가로 화면 권장</div>`,
    );
    this.on(s, '[data-a="continue"]', onContinue);
    this.on(s, '[data-a="install"]', () => void promptInstall());
    if (onLoadCode) this.on(s, '[data-a="loadcode"]', onLoadCode);
    if (onSaveCode) this.on(s, '[data-a="savecode"]', onSaveCode);
    // 숨은 입구: 왼쪽 위 빈 곳을 3초 안에 5번 누르면 테스트 캐릭터
    if (onTest) {
      let taps: number[] = [];
      this.on(s, '[data-a="secret"]', () => {
        const now = performance.now();
        taps = [...taps.filter((t) => now - t < 3000), now];
        if (taps.length >= 5) {
          taps = [];
          onTest();
        }
      });
    }
    this.on(s, '[data-a="patch"]', () => this.patchNotes(again));
    this.on(s, '[data-a="feedback"]', () => this.feedback({ version: GAME_VERSION }, again));
    // 업데이트 확인 → 새 버전이 있으면 같은 버튼이 "업데이트" 버튼으로 바뀐다
    let remote: RemoteVersion | null = null;
    this.on(s, '[data-a="update"]', (b) => {
      if (remote && isNewer(remote)) {
        b.textContent = '업데이트 중…';
        void applyUpdate(remote);
        return;
      }
      b.textContent = '확인 중…';
      void fetchRemoteVersion().then((r) => {
        remote = r;
        if (!r) b.innerHTML = `${SPK('warning', '⚠')} 확인 실패 (인터넷 연결 확인)`;
        else if (isNewer(r)) {
          b.textContent = `⬆ 새 버전 v${r.version} 받기`;
          b.classList.add('primary');
        } else b.textContent = `✔ 최신 버전입니다 (v${GAME_VERSION})`;
      });
    });
    this.on(s, '[data-a="new"]', () => {
      if (hasSave && !confirm('저장된 진행을 지우고 새로 시작할까요?')) return;
      onNew();
    });
  }

  // ---------------- 차원문 광장: 단계 → 방 선택 ----------------
  stageSelect(p: Progress, tier: number, onPick: (tier: number, stage: number) => void, onClose: () => void, onFarm?: (tier: number, kind: 'wood' | 'ore' | 'gold') => void, onEnd?: () => void, onCh8?: (stage: number) => void): void {
    const maxTier = p.maxTier;
    const ch8Open = !!onCh8 && p.flag('ch8') > 0;
    const tiers =
      THEMES.map((t) => {
        const locked = t.tier > maxTier;
        return `<button class="tier-tab ${t.tier === tier ? 'on' : ''} ${locked ? 'locked' : ''}" data-tier="${t.tier}" style="--c:${hex(t.portalColor)}" ${locked ? 'disabled' : ''}>
          <span class="gate"></span><b>${t.tier}${p.data.dimStones.includes(t.tier) ? '<i class="stone">◆</i>' : ''}</b></button>`;
      }).join('') + (ch8Open ? `<button class="tier-tab ${tier === 8 ? 'on' : ''}" data-tier="8" style="--c:${hex(CH8_THEME.portalColor)}"><span class="gate"></span><b>8</b></button>` : '');
    if (tier === 8 && ch8Open) {
      // 8장 「갈라진 차원」: 방마다 차원 규칙
      const cleared = p.data.ch8?.cleared ?? 0;
      const rows = CH8_STAGES.map((st) => {
        const open = st.stage <= cleared + 1;
        const done = st.stage <= cleared;
        const wait = p.bossWait(8, st.stage);
        const mark = st.stage === 10 ? '수문장' : st.stage === 5 ? '파수꾼' : '';
        const sub = !open ? '봉인' : mark ? (wait > 0 ? `${mark} ${formatWait(wait)}` : mark) : done ? '클리어' : '도전';
        return `<button class="stage-btn ${done ? 'done' : ''} ${mark ? 'boss' : ''} ${wait > 0 ? 'waiting' : ''}" data-c8="${st.stage}" ${open ? '' : 'disabled'}>
          <b>8-${st.stage}</b><small>${st.name}</small><small>${st.rules.map((r) => `<span style="color:${hex(CH8_RULES[r].color)}">${CH8_RULES[r].name}</span>`).join('·')} · ${sub}</small></button>`;
      }).join('');
      const s8 = this.open(
        'select',
        `<div class="panel wide">
           <button class="close">${ICONS.close}</button>
           <h2>차원문 광장 <small>8장 · 갈라진 차원</small></h2>
           <div class="tier-tabs">${tiers}</div>
           <p class="hint">차원 포탈 너머의 세계. 방마다 다른 <b>차원 규칙</b>이 붙고 몬스터는 7-10의 ×${ch8Mult(1).toFixed(1)}~×${ch8Mult(10).toFixed(1)}. 전리품은 7단계 것 (좋은 등급이 잘 나옴), 파수꾼·수문장·정예는 <b>세트 장비</b>를 떨어뜨리기도 합니다.${p.data.unlockedClasses.includes('summoner') ? '' : ' 8-10의 수문장을 쓰러뜨리면 새 동료가 합류합니다.'}</p>
           <div class="stage-grid">${rows}</div>
           <p class="hint">${Object.values(CH8_RULES).map((r) => `<b style="color:${hex(r.color)}">${r.name}</b> ${r.text}`).join(' · ')}</p>
         </div>`,
        onClose,
      );
      this.on(s8, '.tier-tab:not(.locked)', (b) => this.stageSelect(p, Number(b.dataset.tier), onPick, onClose, onFarm, onEnd, onCh8));
      this.on(s8, '[data-c8]', (b) => onCh8?.(Number(b.dataset.c8)));
      return;
    }
    const theme = THEMES[Math.min(7, tier) - 1];
    const stages = Array.from({ length: 10 }, (_, i) => {
      const st = i + 1;
      const g = stageIndex(tier, st);
      const open = g <= p.data.cleared + 1;
      const done = g <= p.data.cleared;
      const mark = st === 10 ? '수호자' : st === 5 ? '파수꾼' : '';
      const wait = p.bossWait(tier, st);
      const sub = !open ? '봉인' : mark ? (wait > 0 ? `${mark} ${formatWait(wait)}` : mark) : done ? '클리어' : '도전';
      return `<button class="stage-btn ${done ? 'done' : ''} ${mark ? 'boss' : ''} ${wait > 0 ? 'waiting' : ''}" data-stage="${st}" ${open ? '' : 'disabled'}>
          <b>${tier}-${st}</b><small>${sub}</small></button>`;
    }).join('');
    // 채집 특화 맵: 종류마다 30분에 한 번 (어느 단계든 한 곳)
    const farmBtn = (kind: 'wood' | 'ore' | 'gold') => {
      const wait = p.farmWait(kind);
      const hasTool = kind === 'gold' || p.flag(kind === 'wood' ? 'tool_axe' : 'tool_pickaxe') > 0;
      const icon = kind === 'wood' ? itemGem(WOOD_TIERS[tier - 1]) : kind === 'gold' ? itemGem('gold_ore') : itemGem(ORE_TIERS[tier - 1]);
      const unlocked = p.farmUnlocked(tier);
      const sub = !unlocked ? `${tier}-5 파수꾼 처치 후 열림` : !hasTool ? (kind === 'wood' ? '도끼 필요' : '곡괭이 필요') : wait > 0 ? `${formatWait(wait)} 뒤` : '입장 가능';
      const off = !unlocked || wait > 0 || !hasTool;
      return `<button class="farm-btn ${off ? 'waiting' : ''} ${kind === 'gold' ? 'gold' : ''}" data-farm="${kind}" ${off ? 'disabled' : ''}>${icon}<span><b>${tier}단계 ${kind === 'wood' ? '벌목지' : kind === 'gold' ? '황금 보고' : '광맥지'}</b><small>${sub}${kind === 'gold' && !off ? ` · 약 ${Math.round((vaultPileGold(tier, 0.5) * 40) / 1000)}k G` : ''}</small></span></button>`;
    };
    const farmRow = onFarm ? `<h3>특화 맵 <small class="dim">종류마다 30분에 한 번</small></h3><div class="farm-row">${farmBtn('wood')}${farmBtn('ore')}${farmBtn('gold')}</div>` : '';
    const s = this.open(
      'select',
      `<div class="panel wide">
         <button class="close">${ICONS.close}</button>
         <h2>차원문 광장 <small>${theme.name}</small></h2>
         <div class="tier-tabs">${tiers}</div>
         ${onEnd && p.flag('endgame') && !endLock(p.data.end!, 'rift') ? `<button class="end-banner" data-end="1">${SPK('portal', '◎')} <b>심연 균열</b></button>` : ''}
         <div class="stage-grid">${stages}</div>
         ${farmRow}
       </div>`,
      onClose,
    );
    this.on(s, '.tier-tab:not(.locked):not(.end-tab)', (b) => this.stageSelect(p, Number(b.dataset.tier), onPick, onClose, onFarm, onEnd, onCh8));
    this.on(s, '[data-end]', () => onEnd?.());
    this.on(s, '[data-stage]', (b) => onPick(tier, Number(b.dataset.stage)));
    this.on(s, '[data-farm]', (b) => onFarm?.(tier, b.dataset.farm as 'wood' | 'ore' | 'gold'));
  }

  // ---------------- 차원의 끝 (엔드 콘텐츠) ----------------
  endgame(
    p: Progress,
    h: {
      tower: (floor: number) => void;
      towerDaily: () => void;
      rush: (diff: RushDiff) => void;
      rift: (tier: number, level: number, vows: VowId[]) => void;
      trial: () => void;
      trialAura: (grade: number) => void;
      raid: () => void;
      horde: () => void;
      hordeDaily: () => void;
      /** 같은 건물의 다른 콘텐츠로 (시련 ↔ 레이드, 보스 러시 ↔ 무한 러쉬) */
      view: (c: EndContent) => void;
    },
    onClose: () => void,
    message?: string,
    sel?: { tier: number; level: number; vows?: VowId[] },
    only: EndContent = 'tower',
    view: 'main' | 'info' | 'titles' = 'main',
  ): void {
    const e = p.data.end!;
    const today = todayKey();
    const cur = { tier: sel?.tier ?? Math.min(7, p.maxTier), level: sel?.level ?? Math.max(1, e.riftBest + 1), vows: sel?.vows ?? e.vows ?? [] };
    const dust = (n: number) => (n ? `${inlineGem(DUST)}${n}` : '');
    const res = (id: string) => `<span class="res-chip">${inlineGem(id)}${p.count(id)}</span>`;
    const used = e.rushDate === today ? e.rushUsed : 0;
    const maxLevel = e.riftBest + 1;
    const tr = e.trial && e.trial.week === dayKey() ? e.trial : undefined;
    const trAll = e.trial;
    const spec = trialSpec(dayKey());
    const boardKey = only === 'raid' ? weekKey() : dayKey();
    const boardId = only === 'raid' ? 'raid' : only === 'horde' ? 'horde' : 'trial';
    const scoreTxt = (sc: number) => (boardId === 'raid' ? raidScoreText(sc) : boardId === 'horde' ? `${sc.toLocaleString()}마리` : trialScoreText(sc));
    const rankBlock = (title: string, canUp: boolean) => `<h3 class="sub">${title} <button class="chip rank-refresh" data-rrefresh>🔄 새로고침</button></h3>
        <div class="rank-me"><span>닉네임 <b>${esc(p.data.nickname ?? '')}</b></span>${boardId === 'trial' ? `<button class="rank-up" data-rup ${canUp ? '' : 'disabled'}>내 기록 올리기</button><span data-rup-out class="dim"></span>` : '<span class="dim">기록은 끝날 때 자동으로 올라갑니다</span>'}</div>
        <ol class="rank-board" data-tboard><li class="dim">순위를 불러오는 중…</li></ol>`;
    const sibling: Partial<Record<EndContent, EndContent[]>> = { trial: ['trial', 'raid'], raid: ['trial', 'raid'], rush: ['rush', 'horde'], horde: ['rush', 'horde'] };
    const tabs = sibling[only] ? `<div class="tabs">${sibling[only]!.map((c) => `<button data-endview="${c}" class="${c === only ? 'on' : ''}">${END_NAMES[c]}${endLock(e, c) ? ' 🔒' : ''}</button>`).join('')}</div>` : '';

    // ---------- 첫 화면: 필요한 것만 ----------
    let main = '';
    if (only === 'tower') {
      // 탑: 층 목록 (위가 높은 층). 들어오면 다음 도전 층이 보이도록 스크롤
      const next = e.towerBest + 1;
      const top = Math.max(next + 9, 20);
      const daily = towerDaily(e.towerBest);
      const dailyDone = e.towerDailyDate === today;
      const rows: string[] = [];
      for (let f = top; f >= 1; f--) {
        const b = towerBoss(f);
        const done = f <= e.towerBest;
        const isNext = f === next;
        const fc = towerFirstClear(f);
        const tag = b ? `<span class="fl-boss">${b.kind === 'boss' ? '수호자' : '파수꾼'}</span>` : '';
        const wall = f > 10 && f % 10 === 1 ? '<span class="fl-wall">+15% 벽</span>' : '';
        const right = done
          ? `<span class="ok">✓</span><button class="fl-go" data-tower="${f}">여기서</button>`
          : isNext
            ? `<button class="primary fl-go" data-tower="${f}">도전</button>`
            : `<span class="dim">${fc.gold} G ${dust(fc.dust)}</span>`;
        rows.push(`<div class="floor ${done ? 'done' : ''} ${isNext ? 'next' : ''} ${f > next ? 'locked' : ''}" ${isNext ? 'data-next' : ''}><b>${f}층</b>${tag}${wall}<span class="dim fl-m">×${towerMult(f).toFixed(2)}</span><span class="fl-r">${right}</span></div>`);
      }
      main = `<div class="end-summary"><span>최고 <b>${e.towerBest}층</b></span>
          <button class="small" data-daily ${dailyDone || e.towerBest < 1 ? 'disabled' : ''}>${dailyDone ? '오늘 소탕 완료' : `소탕 ${daily.gold} G ${dust(daily.dust)}`}</button></div>
        <div class="floor-list scroll" data-floors>${rows.join('')}</div>`;
    } else if (only === 'rush') {
      main = `<div class="end-summary"><span>일반·하드 무료 <b>${Math.max(0, RUSH_DAILY - used)}/${RUSH_DAILY}</b></span></div>
        <div class="rush-row">${RUSH_DIFFS.map((d, i) => {
          const locked = i > 0 && !e.rushGradeBest[i - 1];
          const cost = rushEntry(i as RushDiff, used);
          const short = !locked && !p.hasAll(cost);
          const costTxt = Object.entries(cost).map(([id, n]) => `${inlineGem(id)}${n}`).join(' ') || '무료';
          const best = e.rushBest[i] ? `${formatClock(e.rushBest[i])} · ${e.rushGradeBest[i]}` : '-';
          return `<button class="rush-btn big ${locked || short ? 'locked' : ''}" data-rush="${i}" ${locked || short ? 'disabled' : ''}>
            <b>${d.name}</b><small>${d.per}마리씩 · ${rushFights(i as RushDiff).length}전</small>
            <small class="dim">${locked ? `${RUSH_DIFFS[i - 1].name} 완주 후` : `최고 ${best}`}</small><small>${locked ? '' : costTxt}</small></button>`;
        }).join('')}</div>`;
    } else if (only === 'rift') {
      const affixes = riftAffixes(cur.level, today);
      const rr = riftReward(cur.level, true);
      const entry = riftEntry(cur.level);
      main = `<div class="end-summary"><span>최고 <b>${e.riftBest}단계</b></span></div>
        <div class="chips">${THEMES.map((t) => `<button class="chip ${t.tier === cur.tier ? 'on' : ''}" data-rtier="${t.tier}" ${t.tier > p.maxTier ? 'disabled' : ''} style="--c:${hex(t.portalColor)}">${t.tier} ${t.name}</button>`).join('')}</div>
        <div class="menu row stepper">
          <button data-rlv="-1" ${cur.level <= 1 ? 'disabled' : ''}>−</button><b>${cur.level}단계</b><button data-rlv="1" ${cur.level >= maxLevel ? 'disabled' : ''}>+</button>
          <span class="dim">보상 ${rr.gold} G ${dust(rr.dust)}</span>
        </div>
        <div class="chips">${affixes.length ? affixes.map((a) => `<span class="chip" style="--c:${hex(AFFIXES[a].color)}">${AFFIXES[a].name}</span>`).join('') : '<span class="dim">변이 없음</span>'}</div>
        <h3 class="sub">균열 서약 <small class="dim">스스로 제약을 걸수록 보상이 커진다 · 보상 ×${vowMult(cur.vows).toFixed(2)} (${Math.round(rr.gold * vowMult(cur.vows)).toLocaleString()} G ${dust(Math.floor(rr.dust * vowMult(cur.vows)))})</small></h3>
        <div class="chips">${VOW_IDS.map((v) => `<button class="chip ${cur.vows.includes(v) ? 'on' : ''}" data-vow="${v}" style="--c:${hex(VOWS[v].color)}" title="${VOWS[v].text}">${VOWS[v].name} <small>+${Math.round(VOWS[v].bonus * 100)}%</small></button>`).join('')}</div>
        <p class="hint">${cur.vows.length ? cur.vows.map((v) => `<b style="color:${hex(VOWS[v].color)}">${VOWS[v].name}</b> ${VOWS[v].text}`).join(' · ') : '서약 없음 — 버튼을 눌러 제약을 걸 수 있습니다'}</p>
        <div class="menu row"><button class="primary" data-rift ${p.count(entry.id) < entry.n ? 'disabled' : ''}>입장 · ${inlineGem(entry.id)}${entry.n}</button></div>`;
    } else if (only === 'raid') {
      const rs = raidSpec(weekKey());
      const rr = e.raid && e.raid.week === weekKey() ? e.raid : undefined;
      const today = rr && rr.day === dayKey() ? rr : undefined;
      const sp = RAID_SPECIES[rs.boss.id];
      const nextMarks = raidDayMarks(Math.max(1, today?.dayBest ?? 0));
      main = `<div class="end-summary"><span>${weekKey()} · 이번 주 레이드 보스</span>
          <span>이번 주 <b>${rr?.best ? raidScoreText(rr.best) : '기록 없음'}</b> · 처치 ${e.raid?.kills ?? 0}회</span></div>
        <div class="trial-boss"><img src="${monsterIconUrl(sp, rs.boss.tier, true)}" alt=""><div><b>${rs.boss.name}</b><small class="dim">${rs.boss.desc} · 체력 7-10 수호자의 ${RAID_HP}배 · 12줄 · ${formatClock(RAID_TIME)}</small></div></div>
        <p class="hint">오늘 받은 증표 ${inlineGem('eon_mark')} <b>${today?.dayMarks ?? 0}</b> (오늘 기록 ${today?.dayBest ? raidScoreText(today.dayBest) : '없음'}) · 기록이 오르면 차액을 받습니다 (깎은 체력 10%마다 +1, 처치 ${raidDayMarks(10000)}~${raidDayMarks(10000 + 1200)}) · 지난주 순위 보상은 다음 주에 자동으로</p>
        <div class="menu row"><button class="primary" data-raid>도전하기</button></div>
        ${rankBlock('이번 주 레이드 순위', false)}`;
      void nextMarks;
    } else if (only === 'horde') {
      const hr = e.horde;
      const best = hr?.best ?? 0;
      const daily = hordeDaily(best);
      const dailyDone = hr?.dailyDate === todayKey();
      const nextMs = HORDE_MILESTONES[hr?.claimed ?? 0];
      main = `<div class="end-summary"><span>최고 <b>${best.toLocaleString()}마리</b>${hr?.bestTime ? ` · ${formatClock(hr.bestTime)} 버팀` : ''}</span>
          <button class="small" data-hdaily ${dailyDone || best < 1 ? 'disabled' : ''}>${dailyDone ? '오늘 보상 받음' : `일일 보상 ${inlineGem('eon_mark')}${daily.marks} · ${daily.gold.toLocaleString()} G`}</button></div>
        <p class="hint">차원의 틈에서 몬스터가 끝없이 쏟아집니다. 쓰러질 때까지 버티며 최대한 많이 처치하세요. 처치 수가 목표를 넘을 때마다 <b>축복 셋 중 하나</b>를 고르고, ${Math.round(HORDE_BOSS_EVERY)}초마다 보스가 섞여 나옵니다. 쓰러져도 짐은 잃지 않습니다.</p>
        <p class="hint">${nextMs ? `다음 첫 달성 보상: <b>${nextMs.kills.toLocaleString()}마리</b> → ${inlineGem('eon_mark')}${nextMs.marks}` : '첫 달성 보상을 모두 받았습니다'} · 하루 한 번 최고 기록만큼 일일 보상</p>
        <div class="menu row"><button class="primary" data-horde>출전하기</button></div>
        ${rankBlock('오늘의 러쉬 순위', false)}`;
    } else {
      const g = tr ? trialGrade(tr.best) : -1;
      const topG = trAll?.topGrade ?? -1;
      const worn = p.data.aura ?? -1;
      const tb = BOSS_SPECIES[spec.tier - 1];
      main = `<div class="end-summary"><span>${dayKey()} · 오늘의 수호자</span>
          <span>오늘 <b>${tr?.best ? trialScoreText(tr.best) : '기록 없음'}</b> ${g >= 0 ? `<b style="color:${hex(TRIAL_GRADES[g].color)}">${TRIAL_GRADES[g].name}</b>` : ''}</span></div>
        <p class="hint">오늘 받은 증표 ${inlineGem('eon_mark')} <b>${tr?.marks ?? 0}</b> · 오늘 기록의 등급만큼 (참여 2 + ${TRIAL_GRADES.map((t) => `${t.name} ${trialDayMarks(t.min) - 2}`).join(' · ')}) · 어제 순위 보상은 다음 날 자동으로 (1위 20 · 3위 안 14 · 10위 안 9 · 상위 절반 5 · 참여 3)</p>
        <div class="trial-boss"><img src="${monsterIconUrl(tb, spec.tier, true)}" alt=""><div><b>${tb.name}</b><small class="dim">${THEMES[spec.tier - 1].name} · 체력 7-10 수호자의 ${TRIAL_HP}배 · ${formatClock(TRIAL_TIME)}</small></div></div>
        <div class="menu row"><button class="primary" data-trial>도전하기</button></div>
        ${rankBlock('오늘의 순위', !!tr?.best)}
        <h3 class="sub">발밑 오라 ${worn >= 0 ? '<button class="chip" data-taura="-1">끄기</button>' : ''}</h3>
        <div class="rush-row trial-row">${TRIAL_GRADES.map((t, i) => {
          const open = topG >= i;
          return `<button class="rush-btn aura-btn ${open ? '' : 'locked'} ${worn === i ? 'on' : ''}" data-taura="${i}" ${open ? '' : 'disabled'} style="--c:${hex(t.color)}"><b style="color:${hex(t.color)}">${t.name}</b><small class="dim">${t.min}점</small></button>`;
        }).join('')}</div>`;
    }

    // ---------- 설명: 규칙·보상·재료 ----------
    const infoOf: Record<EndContent, string> = {
      tower: `<ul class="info-list">
          <li>한 층은 둥근 단 하나. 웨이브 3번을 모두 정리하면 가운데 문으로 위층에 오릅니다.</li>
          <li>5층마다 파수꾼, 10층마다 수호자가 마지막 웨이브에 나옵니다.</li>
          <li>난이도: 1층은 7-10 수준. 1~10층은 층마다 +5%, 11층부터 층마다 +3%에 10층마다 한 번에 +15% 벽.</li>
          <li>보상: 층을 처음 돌파하면 골드와 ${inlineGem(DUST)}차원 가루. 하루 한 번 최고 층만큼 소탕 보상.</li>
          <li>깬 층은 어디서든 다시 시작할 수 있습니다 (다시 깨면 몬스터 전리품만).</li>
        </ul>`,
      rush: `<ul class="info-list">
          <li>1단계 파수꾼부터 7단계 수호자까지 연속으로 싸웁니다. 보스 사이에 체력 25%만 회복.</li>
          <li>일반: 한 마리씩 14전 · 하드: 두 마리씩 7전(체력 ×1.5, 공격 ×1.3) · 지옥: 세 마리씩 5전(체력 ×2.2, 공격 ×1.6).</li>
          <li>일반·하드는 하루 ${RUSH_DAILY}번 무료, 그 뒤는 ${inlineGem(ALLOY)}차원 합금 ${RUSH_EXTRA_ALLOY}. 지옥은 매번 ${inlineGem(ALLOY2)}상급 차원 합금 1.</li>
          <li>등급: 10분 안 S · 15분 A · 20분 B · 그 밖 C. 보상은 완주했을 때 한꺼번에 (S: 일반 ${dust(rushReward(0, 'S').dust)} · 하드 ${dust(rushReward(1, 'S').dust)} · 지옥 ${dust(rushReward(2, 'S').dust)}).</li>
        </ul>`,
      rift: `<ul class="info-list">
          <li>고른 맵(1~7단계)을 7-10보다 강한 난이도로 엽니다. 단계마다 몬스터 +12% (지금 ×${riftMult(cur.level).toFixed(2)}).</li>
          <li>${Math.floor(RIFT_TIME / 60)}분 안에 모두 쓰러뜨리면 다음 단계가 열리고 보상 전부, 늦으면 절반.</li>
          <li>차원 가루와 좋은 장비를 파밍하는 곳이라 광맥·나무는 적습니다 (자원은 기본 스테이지·채집 특화 맵).</li>
          <li>입장: 1~${RIFT_ALLOY2_FROM - 1}단계 ${inlineGem(ALLOY)}차원 합금 ${RIFT_ALLOY} · ${RIFT_ALLOY2_FROM}단계부터 ${inlineGem(ALLOY2)}상급 차원 합금 ${RIFT_ALLOY} (제작대).</li>
          <li>오늘의 변이: ${riftAffixes(cur.level, today).map((a) => `<b style="color:${hex(AFFIXES[a].color)}">${AFFIXES[a].name}</b> ${AFFIXES[a].text}`).join(' · ') || '없음'}</li>
        </ul>`,
      trial: `<ul class="info-list">
          <li>매일 무작위로 정해지는 수호자 한 마리와 ${formatClock(TRIAL_TIME)} 동안 싸웁니다. 내 장비·능력치 그대로 (강해질수록 기록이 오릅니다).</li>
          <li>체력이 7-10 수호자의 ${TRIAL_HP}배라 시간 안에 깎은 체력 비율이 기록입니다. 쓰러뜨리면 걸린 시간이 기록 (빠를수록 위).</li>
          <li>체력이 10% 깎일 때마다 <b>격노 단계</b>가 올라 공격 +${Math.round(TRIAL_RAGE.atk * 100)}% · 이동 +${Math.round(TRIAL_RAGE.speed * 100)}% · 패턴 사이 쉬는 시간이 줄고, 2단계부터 강화 패턴을 씁니다.</li>
          <li>중급 물약 3개 지급, 쓰러져도 짐을 잃지 않음. 몇 번이든 도전 가능. 시간은 수호자와 싸움이 시작되면 흐릅니다.</li>
          <li>등급(${TRIAL_GRADES.map((t) => `${t.name} ${t.min >= 10000 ? '처치' : `${t.min / 100}%`}`).join(' · ')})을 처음 달성하면 그 등급의 발밑 오라를 얻습니다.</li>
          ${tr && tr.best ? `<li>내 기록 코드: <input class="code-box" readonly value="${trialCode(tr.week, tr.cls, tr.best, tr.time, tr.hits)}"></li>` : ''}
          <li>친구 코드 확인: <input class="code-box" data-tcode placeholder="DT-..."> <span data-tcode-out></span></li>
          <li>보상: 오늘 기록의 등급만큼 ${inlineGem('eon_mark')}영겁의 증표 (기록이 오르면 차액), 다음 날 어제 순위에 따라 증표를 더 받습니다.</li>
          <li>지난 기록: ${trAll?.history.length ? trAll.history.slice(0, 5).map((x) => `${x.week} ${trialScoreText(x.best)} ${x.grade >= 0 ? TRIAL_GRADES[x.grade].name : '-'}`).join(' · ') : '없음'}</li>
        </ul>`,
      raid: `<ul class="info-list">
          <li>매주 바뀌는 레이드 보스(${RAID_SPECIES.r1.name} · ${RAID_SPECIES.r2.name} · ${RAID_SPECIES.r3.name})를 ${formatClock(RAID_TIME)} 안에 쓰러뜨립니다. 내 장비·능력치 그대로, 물약은 내 주머니의 것.</li>
          <li>체력 12줄. 8줄·4줄에서 보호막을 펼치고 수호병을 부릅니다 (수호병을 모두 쓰러뜨리면 풀림). 체력이 10% 깎일 때마다 격노 단계가 오릅니다.</li>
          <li>기록: 처치했으면 걸린 시간, 못 잡았으면 깎은 체력. 몇 번이든 도전할 수 있고 가장 좋은 기록이 순위에 오릅니다.</li>
          <li>보상: 하루 한 번 오늘 기록만큼 ${inlineGem('eon_mark')}증표 (기록이 오르면 차액), 처치하면 35% 확률로 세트 장비, 한 주가 끝나면 순위 보상 (1위 60 · 3위 안 42 · 10위 안 27 · 상위 절반 15 · 참여 9).</li>
        </ul>`,
      horde: `<ul class="info-list">
          <li>넓은 벌판 한가운데서 시작합니다. 차원의 틈에서 몬스터가 사방에서 끝없이 나오고, 시간이 갈수록 강해지고 많아집니다 (1분마다 +18%).</li>
          <li>${Math.round(HORDE_BOSS_EVERY)}초마다 파수꾼·수호자가 번갈아 나옵니다 (보스는 10마리로 셉니다).</li>
          <li>처치 수가 목표를 넘을 때마다 축복 셋 중 하나를 고릅니다: ${BLESS_IDS.map((b) => `<b style="color:${hex(BLESSINGS[b].color)}">${BLESSINGS[b].name}</b>`).join(' · ')}.</li>
          <li>몬스터는 전리품을 떨어뜨리지 않고, 끝날 때 처치 수 × 40 G. 경험치는 절반.</li>
          <li>첫 달성 보상: ${HORDE_MILESTONES.map((m) => `${m.kills} → ${m.marks}`).join(' · ')} (증표). 하루 한 번 최고 기록만큼 일일 보상 (200마리마다 증표 1, 최대 15).</li>
        </ul>`,
    };
    const common = `<p class="dim">보상은 ${inlineGem(DUST)}차원 가루로 받습니다. 차원집의 차원 응축기에서 가루 ${DUST_PER_SHARD} + 상급 정수 + 티타늄판 → ${inlineGem(SHARD)}차원 파편(궁극기 강화·각인·초월).</p>`;
    const titles = `<ul class="list">${TITLES.map((t) => {
      const got = p.data.titles?.includes(t.id);
      return `<li class="${got ? '' : 'locked'}"><div><b>${got ? `「${t.name}」` : '???'}</b><small>${t.cond} · ${Object.entries(t.bonus).map(([k, v]) => bonusText(k as BonusKey, v!)).join(', ')}</small></div>${got ? '<span class="ok">획득</span>' : ''}</li>`;
    }).join('')}</ul>`;
    const chips = only === 'trial' || only === 'raid' || only === 'horde' ? res('eon_mark') : only === 'tower' ? res(DUST) : `${res(DUST)}${res(ALLOY)}${res(ALLOY2)}`;

    const body = view === 'info' ? `<div class="scroll">${infoOf[only]}${only === 'trial' || only === 'raid' || only === 'horde' ? '' : common}</div>` : view === 'titles' ? `<div class="scroll">${titles}</div>` : `${tabs}${main}`;
    const s = this.open(
      'endgame',
      `<div class="panel wide tall end-panel">
         <div class="end-head">
           ${view !== 'main' ? '<button class="small" data-view="main">← 돌아가기</button>' : ''}
           <h2>${END_NAMES[only]}${view === 'info' ? ' · 설명' : view === 'titles' ? ' · 칭호' : ''}</h2>
           <span class="res">${chips}</span>
           <span class="head-btns">${view === 'main' ? `<button class="small" data-view="info">설명</button><button class="small" data-view="titles">칭호 ${p.data.titles?.length ?? 0}</button>` : ''}<button class="close-inline">${ICONS.close}</button></span>
         </div>
         ${message ? `<div class="notice">${message}</div>` : ''}
         ${body}
       </div>`,
      onClose,
    );
    const again = (m?: string, ns = cur, v = view) => this.endgame(p, h, onClose, m, ns, only, v);
    this.on(s, '[data-view]', (b) => again(undefined, cur, b.dataset.view as 'main' | 'info' | 'titles'));
    this.on(s, '.close-inline', () => this.close());
    this.on(s, '[data-tower]', (b) => h.tower(Number(b.dataset.tower)));
    this.on(s, '[data-daily]', () => h.towerDaily());
    this.on(s, '[data-rush]', (b) => h.rush(Number(b.dataset.rush) as RushDiff));
    this.on(s, '[data-rtier]', (b) => again(message, { ...cur, tier: Number(b.dataset.rtier) }));
    this.on(s, '[data-rlv]', (b) => again(message, { ...cur, level: Math.max(1, Math.min(maxLevel, cur.level + Number(b.dataset.rlv))) }));
    this.on(s, '[data-rift]', () => h.rift(cur.tier, cur.level, cur.vows));
    this.on(s, '[data-vow]', (b) => {
      const v = b.dataset.vow as VowId;
      const vows = cur.vows.includes(v) ? cur.vows.filter((x) => x !== v) : [...cur.vows, v];
      again(message, { ...cur, vows });
    });
    this.on(s, '[data-trial]', () => h.trial());
    this.on(s, '[data-raid]', () => h.raid());
    this.on(s, '[data-horde]', () => h.horde());
    this.on(s, '[data-hdaily]', () => h.hordeDaily());
    this.on(s, '[data-endview]', (b) => h.view(b.dataset.endview as EndContent));
    this.on(s, '[data-taura]', (b) => h.trialAura(Number(b.dataset.taura)));
    // 주간 시련 순위 (의견함과 같은 시트)
    const board = s.querySelector<HTMLElement>('[data-tboard]');
    const loadBoard = () => {
      if (!board) return;
      void fetchBoard(boardKey, 3, boardId).then((r) => {
        if (!board.isConnected) return;
        if (!r.ok) board.innerHTML = `<li class="dim">순위를 불러오지 못했습니다 · ${esc(r.reason)}</li>`;
        else if (!r.rows.length) board.innerHTML = '<li class="dim">아직 기록이 없습니다. 첫 기록을 올려 보세요!</li>';
        else
          board.innerHTML = r.rows
            .map((x, i) => `<li class="${x.me ? 'me' : ''}"><b class="rk">${i + 1}</b><span class="nm">${esc(x.name)}</span><small class="dim">${CLASSES[x.cls as ClassId]?.name ?? ''} Lv.${x.level}</small><b class="sc">${scoreTxt(x.score)}</b></li>`)
            .join('');
      });
    };
    loadBoard();
    this.on(s, '[data-rrefresh]', () => {
      if (board) board.innerHTML = '<li class="dim">순위를 불러오는 중…</li>';
      loadBoard();
    });
    this.on(s, '[data-rup]', (b) => {
      const name = p.data.nickname ?? '';
      const upOut = s.querySelector<HTMLElement>('[data-rup-out]');
      if (!tr?.best || !name) return;
      (b as HTMLButtonElement).disabled = true;
      if (upOut) upOut.textContent = '올리는 중…';
      void submitTrial({ board: 'trial', week: tr.week, name, cls: tr.cls || p.data.currentClass, level: p.data.classes[(tr.cls || p.data.currentClass) as ClassId]?.level ?? 1, score: tr.best, seconds: tr.time, boss: BOSS_SPECIES[spec.tier - 1].name, version: GAME_VERSION }).then((r) => {
        (b as HTMLButtonElement).disabled = false;
        if (upOut) upOut.innerHTML = r.ok ? '<span class="ok">올렸습니다!</span>' : `<span class="bad">${esc(r.reason ?? '실패')}</span>`;
        if (r.ok) loadBoard();
      });
    });
    // 탑: 다음 도전 층이 목록 가운데 오도록
    const list = s.querySelector<HTMLElement>('[data-floors]');
    const nextRow = s.querySelector<HTMLElement>('[data-next]');
    if (list && nextRow) list.scrollTop = nextRow.offsetTop - list.offsetTop - list.clientHeight / 2 + nextRow.clientHeight / 2;
    const input = s.querySelector<HTMLInputElement>('[data-tcode]');
    const out = s.querySelector<HTMLElement>('[data-tcode-out]');
    input?.addEventListener('input', () => {
      const r = readTrialCode(input.value);
      if (out) out.innerHTML = !input.value.trim() ? '' : r ? `<b>${r.week}</b> ${CLASSES[r.cls as ClassId]?.name ?? r.cls} · <b>${trialScoreText(r.score)}</b> ${trialGrade(r.score) >= 0 ? TRIAL_GRADES[trialGrade(r.score)].name : ''} · 피격 ${r.hits}` : '<span class="bad">올바르지 않은 코드</span>';
    });
  }

  /** 워프 게이트: 다음 방으로 갈지, 마을로 갈지 */
  warp(label: string, next: string | null, onNext: () => void, onVillage: () => void, onClose: () => void): void {
    const s = this.open(
      'warp',
      `<div class="panel">
         <button class="close">${ICONS.close}</button>
         <h2>워프 게이트</h2>
         <p class="hint">${label} 클리어!</p>
         <div class="menu">
           ${next ? `<button class="primary" data-a="next">다음 방으로 (${next})</button>` : ''}
           <button data-a="village" class="${next ? '' : 'primary'}">마을로 귀환</button>
         </div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-a="next"]', onNext);
    this.on(s, '[data-a="village"]', onVillage);
  }

  // ---------------- 일시정지 ----------------
  // ---------------- 종합 백과사전 ----------------
  encyclopedia(p: Progress, onBack: () => void, tab = 'basics'): void {
    const pages = encyclopediaPages(p);
    const page = pages.find((x) => x.id === tab) ?? pages[0];
    const s = this.open(
      'ency',
      `<div class="panel wide tall ency">
         <button class="close">${ICONS.close}</button>
         <h2>${SPK('book', '📖')} 백과사전</h2>
         <div class="ency-tabs">${pages
           .map((x) => `<button class="ency-tab ${x.id === page.id ? 'on' : ''} ${x.locked ? 'locked' : ''}" data-ency="${x.id}"><img src="${x.icon}" alt="">${x.name}${x.locked ? ' 🔒' : ''}</button>`)
           .join('')}</div>
         <div class="ency-body scroll">${page.locked ? `<div class="ency-locked">🔒<p>${page.locked}</p></div>` : `<h2 class="ency-title">${page.name}</h2>${page.html()}`}</div>
       </div>`,
      onBack,
    );
    this.on(s, '[data-ency]', (b) => {
      this.click();
      this.encyclopedia(p, onBack, b.dataset.ency!);
    });
    // 고른 탭이 보이게
    s.querySelector<HTMLElement>('.ency-tab.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /** 닉네임 정하기 (꼭 정해야 닫힌다). 1~12자, 순위표·의견함·머리 위 이름·대화에 쓴다 */
  nickname(current: string, onOk: (name: string) => void, intro = '모험가의 이름을 정해 주세요'): void {
    const s = this.open(
      'nickname',
      `<div class="panel nick-panel">
         <h2>닉네임 정하기</h2>
         <p>${intro}</p>
         <input class="nick-input" maxlength="${NICK_MAX}" placeholder="1~${NICK_MAX}자" value="${esc(current)}" />
         <div class="nick-msg dim">순위표 · 의견함 · 머리 위 이름 · 대화에 쓰입니다</div>
         <div class="menu"><button class="primary" data-nick-ok>정하기</button></div>
       </div>`,
    );
    s.dataset.locked = '1';
    const input = s.querySelector<HTMLInputElement>('.nick-input')!;
    const msg = s.querySelector<HTMLElement>('.nick-msg')!;
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') ok();
    });
    const ok = () => {
      const name = cleanNickname(input.value);
      if (!name) {
        msg.innerHTML = `<span class="bad">1~${NICK_MAX}자로 적어 주세요 (앞뒤 빈칸·특수 기호 < > 는 빠집니다)</span>`;
        return;
      }
      delete s.dataset.locked;
      this.current?.remove();
      this.current = null;
      onOk(name);
    };
    this.on(s, '[data-nick-ok]', ok);
    window.setTimeout(() => input.focus(), 50);
  }

  // ---------------- 의견함 (구글 시트로 보낸다) ----------------
  feedback(info: FeedbackInfo, onBack: () => void): void {
    let kind: string = FEEDBACK_KINDS[0];
    let name = info.nickname || savedFeedbackName();
    let text = '';
    let status = '';
    let sending = false;
    let timer = 0;
    const render = () => {
      const wait = feedbackWait();
      const secs = Math.ceil(wait / 1000);
      // 기다리는 시간이 끝나면 버튼을 다시 켠다
      window.clearTimeout(timer);
      if (wait > 0) timer = window.setTimeout(() => this.current?.classList.contains('feedback') && !sending && render(), wait + 100);
      const s = this.open(
        'feedback',
        `<div class="panel">
           <button class="close">${ICONS.close}</button>
           <h2>의견 보내기</h2>
           <div class="fb-kinds">${FEEDBACK_KINDS.map((k) => `<button class="chip ${k === kind ? 'on' : ''}" data-kind="${k}">${k}</button>`).join('')}</div>
           <label class="fb-label">이름 <input class="fb-name" maxlength="${FEEDBACK_NAME_MAX}" placeholder="닉네임 (필수)" value="${name.replace(/"/g, '&quot;')}" ${info.nickname ? 'readonly' : ''}/></label>
           <textarea class="fb-text" maxlength="${FEEDBACK_MAX}" placeholder="버그, 어려웠던 점, 바라는 점… 무엇이든 적어 주세요">${text.replace(/</g, '&lt;')}</textarea>
           <div class="fb-foot"><small class="dim"><span data-count>${text.length}</span>/${FEEDBACK_MAX}</small>
             <button class="primary" data-a="send" ${wait > 0 || sending ? 'disabled' : ''}>${sending ? '보내는 중…' : wait > 0 ? `${secs}초 뒤에 다시 보낼 수 있어요` : '보내기'}</button></div>
           ${status ? `<div class="notice">${status}</div>` : ''}
         </div>`,
        onBack,
      );
      const nameEl = s.querySelector<HTMLInputElement>('.fb-name')!;
      const textEl = s.querySelector<HTMLTextAreaElement>('.fb-text')!;
      const count = s.querySelector<HTMLElement>('[data-count]')!;
      nameEl.addEventListener('input', () => (name = nameEl.value));
      textEl.addEventListener('input', () => {
        text = textEl.value.slice(0, FEEDBACK_MAX);
        count.textContent = String(text.length);
      });
      // 입력 중에는 게임 단축키가 먹지 않게
      for (const el of [nameEl, textEl]) el.addEventListener('keydown', (e) => e.stopPropagation());
      this.on(s, '[data-kind]', (b) => {
        kind = b.dataset.kind!;
        render();
      });
      this.on(s, '[data-a="send"]', () => {
        if (sending || feedbackWait() > 0) return;
        if (!name.trim()) {
          status = '<span class="bad">이름을 적어 주세요</span>';
          return render();
        }
        if (text.trim().length < 2) {
          status = '<span class="bad">내용을 적어 주세요</span>';
          return render();
        }
        sending = true;
        status = '';
        render();
        void sendFeedback(kind, name.trim(), text.trim(), info).then((r) => {
          sending = false;
          if (r.ok) {
            text = '';
            status = '<b class="ok">보냈습니다! 소중한 의견 고맙습니다 :)</b>';
          } else status = `<span class="bad">보내지 못했습니다. 잠시 뒤 다시 시도해 주세요</span><br><small class="dim">원인: ${r.reason.replace(/</g, '&lt;')}</small>`;
          render();
        });
      });
    };
    render();
  }

  /** 조작 설정: PC 이동 방식·마우스·키 바꾸기, 모바일 버튼 배치 */
  controlsSettings(c: Controls, apply: (c: Controls) => void, capture: (cb: ((key: string) => void) | null) => void, onBack: () => void, onMobileLayout: () => void, msg?: string): void {
    const again = (m?: string) => this.controlsSettings(c, apply, capture, onBack, onMobileLayout, m);
    const used = new Map<string, Bindable[]>();
    for (const b of BIND_LIST) used.set(c.keys[b.id], [...(used.get(c.keys[b.id]) ?? []), b.id]);
    const rows = BIND_LIST.map((b) => {
      const dup = (used.get(c.keys[b.id]) ?? []).length > 1;
      return `<div class="bind-row"><span>${b.name}</span><button class="bind-key ${dup ? 'dup' : ''}" data-bind="${b.id}">${esc(keyLabel(c.keys[b.id]))}</button></div>`;
    }).join('');
    const s = this.open(
      'controls',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>🎮 조작 설정</h2>
         ${msg ? `<div class="notice">${msg}</div>` : ''}
         <div class="scroll">
           <h3>PC 이동 방식</h3>
           <div class="ctl-row">
             <button data-mm="keys" class="ctl-opt ${c.moveMode === 'keys' ? 'on' : ''}">⌨ 키보드 이동</button>
             <button data-mm="mouse" class="ctl-opt ${c.moveMode === 'mouse' ? 'on' : ''}">🖱 마우스 클릭 이동</button>
           </div>
           ${c.moveMode === 'mouse' ? `<div class="ctl-row"><span>이동 버튼</span>
             <button data-mb="right" class="ctl-opt ${c.moveButton === 'right' ? 'on' : ''}">오른쪽 클릭 이동</button>
             <button data-mb="left" class="ctl-opt ${c.moveButton === 'left' ? 'on' : ''}">왼쪽 클릭 이동</button></div>
             <p class="hint">누르고 있으면 커서를 따라가고, 한 번 누르면 그곳까지 걸어갑니다. 방향키·이동 키를 누르면 멈춥니다.</p>` : ''}
           <label class="toggle"><input type="checkbox" data-ma ${c.mouseAttack ? 'checked' : ''}/> 마우스 ${c.moveMode === 'mouse' ? (c.moveButton === 'left' ? '오른쪽' : '왼쪽') : '왼쪽'} 클릭으로 기본 공격 (키로도 공격: ${esc(keyLabel(c.keys.attack))})</label>
           <h3>키 바꾸기 <small class="dim">버튼을 누른 뒤 새 키를 누르세요 · 빨간 키는 겹침</small></h3>
           <div class="bind-grid">${rows}</div>
           <div class="menu row"><button data-reset-keys>키 기본값으로</button></div>
           <h3>모바일 버튼 배치</h3>
           <p class="hint">공격·회피·스킬·물약 버튼을 끌어서 옮기고 크기를 바꿉니다.</p>
           <div class="menu row"><button class="primary" data-layout>버튼 배치 편집</button></div>
         </div>
       </div>`,
      () => {
        capture(null);
        if (!toLayout) onBack();
      },
    );
    let toLayout = false;
    const set = (fn: () => void, m?: string) => {
      fn();
      apply(c);
      again(m);
    };
    this.on(s, '[data-mm]', (b) => set(() => (c.moveMode = b.dataset.mm as Controls['moveMode'])));
    this.on(s, '[data-mb]', (b) => set(() => (c.moveButton = b.dataset.mb as Controls['moveButton'])));
    s.querySelector<HTMLInputElement>('[data-ma]')?.addEventListener('change', (e) => set(() => (c.mouseAttack = (e.target as HTMLInputElement).checked)));
    this.on(s, '[data-reset-keys]', () => set(() => (c.keys = { ...defaultControls().keys }), '키를 기본값으로 되돌렸습니다'));
    this.on(s, '[data-layout]', () => {
      toLayout = true;
      this.close();
      onMobileLayout();
    });
    this.on(s, '[data-bind]', (b) => {
      const id = b.dataset.bind as Bindable;
      b.textContent = '새 키 입력…';
      b.classList.add('wait');
      capture((key) => {
        if (key === 'escape' && id !== 'pause') return again('취소했습니다');
        set(() => (c.keys[id] = key), `${BIND_LIST.find((x) => x.id === id)!.name}: ${esc(keyLabel(key))}`);
      });
    });
  }

  pause(opts: {
    inDungeon: boolean;
    seed?: number;
    returnStones: number;
    shadows: boolean;
    autoAim: boolean;
    onToggleAim: (on: boolean) => void;
    sound: boolean;
    onReturnStone: () => void;
    onGiveUp: () => void;
    onToggleShadows: (on: boolean) => void;
    onToggleSound: (on: boolean) => void;
    music: number;
    sfx: number;
    onMusicVolume: (v: number) => void;
    onSfxVolume: (v: number) => void;
    onTitle: () => void;
    onSaveCode: () => void;
    onBestiary?: () => void;
    /** 의견 보내기 */
    onFeedback?: () => void;
    /** 백과사전 */
    onEncyclopedia?: () => void;
    /** 조작 설정 */
    onControls?: () => void;
    /** 업적 (v10) */
    onAchievements?: () => void;
    achReady?: number;
    /** 가진 음식 (먹으면 30분 버프) */
    foods?: { id: string; count: number }[];
    foodLeft?: string;
    onEat?: (id: string) => void;
    onClose: () => void;
  }): void {
    const s = this.open(
      'pause',
      `<div class="panel">
         <button class="close">${ICONS.close}</button>
         <h2>메뉴</h2>
         <div class="menu">
           <button data-a="resume" class="primary">계속하기</button>
           ${opts.inDungeon ? `<button data-a="stone" ${opts.returnStones ? '' : 'disabled'}>귀환석 사용 (보유 ${opts.returnStones})</button>` : ''}
           ${opts.inDungeon ? '<button data-a="giveup" class="danger">포기하고 쓰러지기</button>' : ''}
           <label class="toggle"><input type="checkbox" data-t="shadow" ${opts.shadows ? 'checked' : ''}/> 그림자</label>
           <div class="aim-row"><span>스킬 방향</span>
             <button data-aim="auto" class="${opts.autoAim ? 'on' : ''}">${SPK('target', '🎯')} 자동 조준</button>
             <button data-aim="face" class="${opts.autoAim ? '' : 'on'}">${SPK('arrow', '➡')} 바라보는 방향</button></div>
           <label class="toggle"><input type="checkbox" data-t="sound" ${opts.sound ? 'checked' : ''}/> 소리 켜기</label>
           <label class="volume"><span class="vol-name">${SPK('music', '🎵')} 배경음</span><input type="range" min="0" max="100" step="5" value="${Math.round(opts.music * 100)}" data-v="music"/><b data-vl="music">${Math.round(opts.music * 100)}</b></label>
           <label class="volume"><span class="vol-name">${SPK('speaker', '🔊')} 효과음</span><input type="range" min="0" max="100" step="5" value="${Math.round(opts.sfx * 100)}" data-v="sfx"/><b data-vl="sfx">${Math.round(opts.sfx * 100)}</b></label>
           ${opts.foods?.length ? `<div class="food-row">${opts.foodLeft ? `<small class="dim">먹은 음식: ${opts.foodLeft}</small>` : ''}${opts.foods.map((f) => `<button data-eat="${f.id}">${inlineGem(f.id)}${ITEMS[f.id].name} 먹기 (${f.count})</button>`).join('')}</div>` : ''}
           ${opts.onControls ? `<button data-a="controls">🎮 조작 설정</button>` : ''}
           ${opts.onEncyclopedia ? `<button data-a="ency">${SPK('book', '📖')} 백과사전</button>` : ''}
           ${opts.onBestiary ? `<button data-a="bestiary">${SPK('book', '📖')} 몬스터 도감</button>` : ''}
           ${opts.onAchievements ? `<button data-a="ach">🏆 업적${opts.achReady ? ` <b class="ok">(받을 보상 ${opts.achReady})</b>` : ''}</button>` : ''}
           <button data-a="savecode">${SPK('disk', '💾')} 저장 코드 만들기</button>
           ${opts.onFeedback ? `<button data-a="feedback">${SPK('scroll', '✉')} 의견 보내기</button>` : ''}
           <button data-a="title">타이틀로 (자동 저장)</button>
         </div>
         ${opts.seed !== undefined ? `<div class="seed">던전 시드 ${opts.seed}</div>` : ''}
         <div class="keys">배경음: Dreamy Analog Synth Loop · Dreamy Ambient Loop · Relaxing Dreamy Synth Rhodes Loop · Melodic Groove Bass Synth Loop — orangefreesounds.com (CC BY 4.0)</div>
       </div>`,
      opts.onClose,
    );
    this.on(s, '[data-a="resume"]', () => this.close());
    this.on(s, '[data-a="bestiary"]', () => opts.onBestiary?.());
    this.on(s, '[data-a="stone"]', opts.onReturnStone);
    this.on(s, '[data-eat]', (b) => opts.onEat?.(b.dataset.eat!));
    this.on(s, '[data-a="giveup"]', () => {
      if (confirm('포기하면 일반 가방의 아이템을 모두 잃습니다. 계속할까요?')) opts.onGiveUp();
    });
    this.on(s, '[data-a="title"]', opts.onTitle);
    this.on(s, '[data-a="savecode"]', opts.onSaveCode);
    this.on(s, '[data-a="feedback"]', () => opts.onFeedback?.());
    this.on(s, '[data-a="ency"]', () => opts.onEncyclopedia?.());
    this.on(s, '[data-a="controls"]', () => opts.onControls?.());
    this.on(s, '[data-a="ach"]', () => opts.onAchievements?.());
    s.querySelector<HTMLInputElement>('[data-t="shadow"]')!.addEventListener('change', (e) => opts.onToggleShadows((e.target as HTMLInputElement).checked));
    s.querySelector<HTMLInputElement>('[data-t="sound"]')!.addEventListener('change', (e) => opts.onToggleSound((e.target as HTMLInputElement).checked));
    s.querySelectorAll<HTMLButtonElement>('[data-aim]').forEach((b) =>
      b.addEventListener('click', () => {
        const auto = b.dataset.aim === 'auto';
        opts.onToggleAim(auto);
        s.querySelectorAll('[data-aim]').forEach((x) => x.classList.toggle('on', x === b));
      }),
    );
    for (const k of ['music', 'sfx'] as const) {
      const input = s.querySelector<HTMLInputElement>(`[data-v="${k}"]`)!;
      const label = s.querySelector<HTMLElement>(`[data-vl="${k}"]`)!;
      input.addEventListener('input', () => {
        label.textContent = input.value;
        (k === 'music' ? opts.onMusicVolume : opts.onSfxVolume)(Number(input.value) / 100);
      });
      // 효과음은 손을 뗄 때 한 번 들려준다
      if (k === 'sfx') input.addEventListener('change', () => this.click());
    }
  }

  // ---------------- 던전 가방: 누르면 정보, 반대쪽 가방을 누르면 옮기기 ----------------
  bag(bag: Bag, dimBag: Bag, onMove: (from: 'bag' | 'dim', index: number) => boolean, onClose: () => void, onEquip?: () => void): void {
    let info = '';
    let sel: { from: 'bag' | 'dim'; i: number } | null = null;
    /** 버리기는 한 번 더 눌러야 한다 */
    let dropArm = false;
    const dropRow = () => {
      if (!sel) return '';
      const x = (sel.from === 'bag' ? bag : dimBag).slots[sel.i];
      if (!x) return '';
      const many = !x.equip && x.count > 1;
      return `<div class="drop-row">${many ? '<button class="tool-sm" data-a="drop1">1개 버리기</button>' : ''}<button class="tool-sm ${dropArm ? 'danger' : ''}" data-a="drop">${dropArm ? '정말 버릴까요? 한 번 더 누르세요' : many ? `전부 버리기 (${x.count}개)` : '버리기'}</button></div>`;
    };
    const render = () => {
      const cell = (s: Slot | null, from: string, i: number) => {
        const on = sel && sel.from === from && sel.i === i ? 'sel' : '';
        if (!s) return `<div class="slot" data-empty="${from}"></div>`;
        const color = s.equip ? GRADES[s.equip.grade].color : ITEMS[s.itemId].color;
        return `<div class="slot filled ${on}" data-from="${from}" data-i="${i}" style="--c:${hex(color)}">${s.equip ? equipGem(s.equip) : itemGem(s.itemId)}<span class="cnt">${s.equip ? `+${s.equip.plus}` : s.count}</span></div>`;
      };
      const target = sel ? (sel.from === 'bag' ? 'dim' : 'bag') : '';
      const s = this.open(
        'bag',
        `<div class="panel wide">
           <button class="close">${ICONS.close}</button>
           <h2>가방 <small>${bag.used}/${bag.slots.length}</small> ${onEquip ? `<button class="tool-sm" data-a="equip">${SPK('shield', '🛡')} 장비 교체</button>` : ''}</h2>
           <div class="bag-grid ${target === 'bag' ? 'drop' : ''}" data-bag="bag">${bag.slots.map((x, i) => cell(x, 'bag', i)).join('')}</div>
           <div class="item-info">${info}${dropRow()}</div>
           <h3>차원가방 <small>${dimBag.used}/${dimBag.slots.length}</small></h3>
           <div class="bag-grid dim-row ${target === 'dim' ? 'drop' : ''}" data-bag="dim">${dimBag.slots.map((x, i) => cell(x, 'dim', i)).join('')}</div>
         </div>`,
        onClose,
      );
      if (onEquip) this.on(s, '[data-a="equip"]', onEquip);
      const discard = (one: boolean) => {
        if (!sel) return;
        const b = sel.from === 'bag' ? bag : dimBag;
        const x = b.slots[sel.i];
        if (!x) return;
        const name = x.equip ? equipName(x.equip) : ITEMS[x.itemId].name;
        if (one && !x.equip && x.count > 1) {
          x.count--;
          info = `${name} 1개를 버렸습니다`;
          this.click();
          return render();
        }
        if (!dropArm) {
          dropArm = true;
          return render();
        }
        info = `${name}${x.equip ? '' : ` ${x.count}개`}을(를) 버렸습니다`;
        b.slots[sel.i] = null;
        sel = null;
        dropArm = false;
        this.click();
        render();
      };
      this.on(s, '[data-a="drop"]', () => discard(false));
      this.on(s, '[data-a="drop1"]', () => discard(true));
      s.querySelectorAll<HTMLElement>('.bag-grid').forEach((grid) =>
        grid.addEventListener('click', (e) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>('.slot');
          const gridName = grid.dataset.bag as 'bag' | 'dim';
          // 선택한 아이템이 있고 반대쪽 가방을 눌렀으면 옮긴다
          if (sel && gridName !== sel.from) {
            const src = (sel.from === 'bag' ? bag : dimBag).slots[sel.i];
            const name = src ? (src.equip ? equipName(src.equip) : ITEMS[src.itemId].name) : '';
            dropArm = false;
            info = onMove(sel.from, sel.i) ? `${name} → ${sel.from === 'bag' ? '차원가방' : '일반 가방'}으로 옮겼습니다` : '<span class="bad">옮길 칸이 없습니다</span>';
            sel = null;
            this.click();
            return render();
          }
          if (el?.classList.contains('filled')) {
            const from = el.dataset.from as 'bag' | 'dim';
            const i = Number(el.dataset.i);
            sel = sel && sel.from === from && sel.i === i ? null : { from, i };
            dropArm = false;
            info = sel ? `${slotInfo((from === 'bag' ? bag : dimBag).slots[i]!)}<br><small class="ok">→ ${from === 'bag' ? '차원가방' : '일반 가방'}</small>` : info;
            this.click();
            render();
          }
        }),
      );
    };
    render();
  }

  // ---------------- 레시피북 (차원집) ----------------
  recipeBook(p: Progress, tab: string, onClose: () => void): void {
    const tabs: [string, string][] = [
      ['smelter', '제련로'],
      ['crusher', '벌목소'],
      ['infuser', '마력 주입기'],
      ['alchemy', '연금 솥'],
      ['condenser', '차원 응축기'],
      ['workbench', '제작대'],
      ['source', '재료 얻는 곳'],
    ];
    const io = (items: Record<string, number>) =>
      Object.entries(items)
        .map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'dim'}">${inlineGem(id)}${ITEMS[id].name}×${n}</span>`)
        .join(' + ');
    const row = (out: string, count: number, inputs: Record<string, number>, note: string) =>
      `<li>${itemGem(out)}<div><b>${ITEMS[out].name}${count > 1 ? ` ×${count}` : ''} <small class="dim">보유 ${p.count(out)}</small></b><small>${io(inputs)}</small><small class="dim">${note}</small></div></li>`;
    let body = '';
    if (tab === 'workbench') {
      const rows: string[] = [];
      for (let t = 1; t <= 7; t++) {
        const c = plateCraftCost(t);
        rows.push(row(TIER_PLATE[t - 1], 1, c.items, `제작대 Lv.${t} · ${c.time}초 · +1~+5 강화 재료`));
        const m = manaPlateCraftCost(t);
        rows.push(row(MANA_PLATE_OF(t), 1, m.items, `제작대 Lv.${t} · ${m.time}초 · +6~+10 강화 재료`));
      }
      for (const r of recipesFor('workbench')) rows.push(row(r.output, r.count, r.inputs, `제작대 Lv.${r.tier} · ${r.time}초 · 조립`));
      body = `<ul class="list">${rows.join('')}</ul>`;
    } else if (tab === 'source') {
      const src: [string, string][] = [
        ['copper_ore', '1~2챕터 던전 광맥 (곡괭이)'],
        ['iron_ore', '2~3챕터 던전 광맥 · 2챕터는 뒤쪽 방일수록 많음'],
        ['gold_ore', '3~4챕터 던전 광맥'],
        ['wood', '1~2챕터 던전 나무 (도끼) · 이후 단계 나무도 같은 방식'],
        ['essence_low', '1~3챕터 몬스터 (일반 약 20%, 정예·보스 확정) · 퀘스트 보상'],
        ['essence_mid', '4~5챕터 몬스터'],
        ['essence_high', '6챕터 몬스터'],
        ['essence_supreme', '7챕터 몬스터'],
        ['dim_dust', '5챕터 이상 파수꾼(6~8)·수호자(16~24) 확정 (엔딩 뒤에는 모든 챕터), 7챕터 정예(가끔), 무한의 탑 첫 돌파·소탕, 보스 러시 완주, 심연 균열, 촌장 납품 의뢰'],
        ['dim_shard', '차원 응축기: 차원 가루 8 + 상급 정수 + 티타늄판 → 궁극기 강화 · 각인 · 초월'],
        ['essence_dim', '차원 응축기: 차원 가루 4 + 최상급 정수 + 오리하르콘 주괴 → 최고 연료'],
        ['dim_alloy', '차원집 제작대 Lv.4 (구리·철·황금·다이아판 + 상급 정수) → 심연 균열 1~10단계 입장, 보스 러시 추가 도전'],
        ['dim_alloy2', '차원집 제작대 Lv.6 (티타늄·오리하르콘판 + 마력 티타늄판 + 최상급 정수) → 심연 균열 11단계 이상, 보스 러시 지옥'],
        ['gear_part', '5챕터 톱니 잔해'],
        ['magi_alloy', '5챕터 합금 잔해'],
        ['potion', '상인 무트 (기본 물약만 판매)'],
      ];
      body = `<ul class="list">${src.map(([id, where]) => `<li>${itemGem(id)}<div><b>${ITEMS[id].name} <small class="dim">보유 ${p.count(id)}</small></b><small>${where}</small></div></li>`).join('')}</ul>`;
    } else {
      const recipes = RECIPES.filter((r) => r.machine === tab);
      const b = BUILDINGS[tab as BuildingType];
      body = `<ul class="list">${recipes.map((r) => row(r.output, r.count, r.inputs, `${b.name} Lv.${r.tier} · ${r.time}초`)).join('')}</ul>`;
    }
    const s = this.open(
      'recipes',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>레시피북</h2>
         <div class="tabs recipe-tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
         <div class="scroll">${body}</div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-tab]', (el) => this.recipeBook(p, el.dataset.tab!, onClose));
  }

  // ---------------- 패치노트 ----------------
  patchNotes(onClose: () => void): void {
    const body = PATCH_NOTES.map(
      (n, i) => `<section class="patch ${i === 0 ? 'latest' : ''}"><h3>v${n.version} <small>${n.date}${i === 0 ? ' · 최신' : ''}</small></h3><ul>${n.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`,
    ).join('');
    this.open(
      'patchnotes',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>패치노트 <small>지금 버전 v${GAME_VERSION}</small></h2>
         <div class="scroll">${body}</div>
       </div>`,
      onClose,
    );
  }

  // ---------------- 저장 코드 ----------------
  saveCode(code: string, onClose: () => void): void {
    const s = this.open(
      'savecode',
      `<div class="panel wide">
         <button class="close">${ICONS.close}</button>
         <h2>저장 코드 <small>${code.length.toLocaleString()}자</small></h2>
         <p class="hint">이 코드를 메모장·메신저 등에 복사해 두세요. 타이틀 화면의 <b>저장 코드로 불러오기</b>에 붙여 넣으면 지금 상태로 돌아옵니다. (다른 기기로 옮길 때도 쓸 수 있어요)</p>
         <textarea class="code" readonly>${code}</textarea>
         <div class="menu two"><button class="primary" data-a="copy">복사하기</button><button data-a="close">닫기</button></div>
       </div>`,
      onClose,
    );
    const ta = s.querySelector<HTMLTextAreaElement>('textarea')!;
    this.on(s, '[data-a="copy"]', (b) => {
      ta.select();
      const done = () => (b.textContent = '✔ 복사했습니다');
      navigator.clipboard?.writeText(code).then(done, () => {
        document.execCommand('copy');
        done();
      }) ?? (document.execCommand('copy'), done());
    });
    this.on(s, '[data-a="close"]', () => this.close());
  }

  loadCode(onLoad: (code: string, done: (msg: string) => void) => void, onClose: () => void): void {
    const s = this.open(
      'loadcode',
      `<div class="panel wide">
         <button class="close">${ICONS.close}</button>
         <h2>저장 코드로 불러오기</h2>
         <p class="hint">복사해 둔 저장 코드를 붙여 넣으세요. <b class="bad">지금 이 기기의 진행은 코드의 내용으로 바뀝니다.</b></p>
         <textarea class="code" placeholder="YG1Z:..."></textarea>
         <div class="item-info" data-msg></div>
         <div class="menu two"><button class="primary" data-a="load">불러오기</button><button data-a="close">취소</button></div>
       </div>`,
      onClose,
    );
    const ta = s.querySelector<HTMLTextAreaElement>('textarea')!;
    const msg = s.querySelector<HTMLElement>('[data-msg]')!;
    this.on(s, '[data-a="load"]', () => {
      msg.textContent = '확인 중…';
      onLoad(ta.value, (m) => (msg.innerHTML = m));
    });
    this.on(s, '[data-a="close"]', () => this.close());
  }

  // ---------------- 예/아니오 ----------------
  ask(title: string, text: string, onYes: () => void, onNo: () => void): void {
    const s = this.open(
      'ask',
      `<div class="panel">
         <h2>${title}</h2>
         <p class="hint">${text}</p>
         <div class="menu two"><button class="primary" data-a="yes">예</button><button data-a="no">아니오</button></div>
       </div>`,
      onNo,
    );
    this.on(s, '[data-a="yes"]', onYes);
    this.on(s, '[data-a="no"]', () => this.close());
  }

  // ---------------- 결과 ----------------
  result(info: ResultInfo, onContinue: () => void): void {
    const rows = [...info.items].map(([id, n]) => `<li>${itemGem(id)}${ITEMS[id].name}<b>× ${n}</b></li>`).join('');
    const eqRows = info.equips.map((e) => `<li>${equipGem(e)}<span>${equipTitle(e)}</span><b>장비</b></li>`).join('');
    const lostRows = info.lost ? [...info.lost].map(([id, n]) => `<li class="lost">${itemGem(id)}${ITEMS[id].name}<b>− ${n}</b></li>`).join('') : '';
    const m = Math.floor(info.seconds / 60);
    const sec = Math.floor(info.seconds % 60);
    const s = this.open(
      `result ${info.lost ? 'dead' : ''}`,
      `<div class="panel tall">
         <h2>${info.title}</h2>
         ${info.note ? `<p class="hint">${info.note}</p>` : ''}
         <div class="stats"><span>시간 <b>${m}분 ${sec}초</b></span>${info.stages ? `<span>클리어 <b>${info.stages}방</b></span>` : ''}<span>골드 <b>+${info.gold}</b></span><span>경험치 <b>+${info.exp}</b></span></div>
         <ul class="loot scroll">${rows}${eqRows}${lostRows}${!rows && !eqRows && !lostRows ? '<li class="empty">가져온 전리품이 없습니다</li>' : ''}</ul>
         ${info.lostEquips ? `<p class="hint">잃어버린 장비 ${info.lostEquips}개</p>` : ''}
         <div class="menu"><button class="primary" data-ok>마을로</button></div>
       </div>`,
      onContinue,
    );
    this.on(s, '[data-ok]', () => this.close());
  }

  // ---------------- 캐릭터: 장비 · 창고 · 능력치 · 퀘스트 ----------------
  /** field.bags: 지금 가방들. 던전 안(dungeon)에서는 창고 장비를 쓸 수 없고, 벗은 장비는 가방으로 간다 */
  inventory(p: Progress, quests: Quests, tab: 'equip' | 'skills' | 'stats' | 'quest', onChange: () => void, onClose: () => void, selSlot?: EquipSlot, field?: { bags: Bag[]; dungeon: boolean }, selSkill?: number): void {
    const cls = CLASSES[p.data.currentClass];
    const st = p.stats();
    const c = p.cls;
    let body = '';
    if (tab === 'equip') {
      // 인형 옷 입히기: 가운데 캐릭터, 왼쪽은 몸에 입는 것, 오른쪽은 무기와 장신구
      const slotBox = (slot: EquipSlot) => {
        const e = c.equipment[slot];
        const name = slotName(slot, p.data.currentClass);
        const broken = e && durability(e) <= 0;
        return `<button class="doll-slot ${slot} ${e ? 'filled' : ''} ${selSlot === slot ? 'sel' : ''} ${broken ? 'broken' : ''}" data-slot="${slot}" ${e ? `style="--c:${hex(GRADES[e.grade].color)}"` : ''}>
          ${e ? equipGem(e) : ''}<span class="doll-label">${name}${e && e.plus ? ` +${e.plus}` : ''}</span>${e ? `<i class="dur" style="width:${durability(e)}%"></i>` : ''}</button>`;
      };
      const sel = selSlot ? c.equipment[selSlot] : undefined;
      const info = sel
        ? `${equipTitle(sel)} <button data-un="${selSlot}">해제</button>${equipDetail(sel)}<small class="dim">내구도 ${durability(sel)}/${EQUIP_MAX_DUR}</small>`
        : selSlot
          ? `<span class="dim">${slotName(selSlot, p.data.currentClass)} 칸이 비어 있습니다. 아래 목록에서 장착하세요.</span>`
          : '';
      const bagEquips = field ? field.bags.flatMap((b) => b.equips()) : [];
      const pool = [...bagEquips, ...(field?.dungeon ? [] : p.data.equips)];
      const list = pool
        .filter((e) => !selSlot || e.slot === selSlot)
        .slice()
        .sort((a, b) => b.tier * 10 + b.grade - (a.tier * 10 + a.grade))
        .map((e) => {
          const ok = p.canEquip(e);
          return `<li>${equipGem(e)}<div>${equipTitle(e)}<small>${bagEquips.includes(e) ? '<span class="ok">[가방]</span> ' : '<span class="dim">[창고]</span> '}${slotName(e.slot, e.cls)} · ${equipLine(e) || '<span class="bad">망가짐</span>'} · 내구 ${durability(e)}${e.cls && e.cls !== p.data.currentClass ? ` · ${CLASSES[e.cls].name} 전용` : ''}</small></div><button data-eq="${e.uid}" ${ok ? '' : 'disabled'}>장착</button></li>`;
        })
        .join('');
      const portrait = heroPortraitUrl(p.data.currentClass, gearLook(c.equipment));
      body = `<div class="scroll"><div class="doll">
          <div class="doll-col">${(['helmet', 'armor', 'pants', 'boots'] as EquipSlot[]).map(slotBox).join('')}</div>
          <div class="doll-body">${portrait ? `<img src="${portrait}" alt="">` : ''}<small>${cls.name} Lv.${c.level}</small></div>
          <div class="doll-col">${(['weapon', 'necklace', 'ring'] as EquipSlot[]).map(slotBox).join('')}
            <div class="doll-stats"><span>공격 <b>${st.atk}</b></span><span>방어 <b>${st.def}</b></span><span>HP <b>${st.maxHp}</b></span><span>치명 <b>${st.crit}%</b></span></div></div>
        </div>
        <div class="item-info">${info}</div>
        <h3>채집 도구</h3>
        <div class="tool-row">${(['pickaxe', 'axe'] as ToolKind[])
          .map((k) => {
            const t = p.data.tools[k];
            const owned = p.flag(k === 'axe' ? 'tool_axe' : 'tool_pickaxe') > 0;
            if (!owned) return `<div class="tool-card dim">${k === 'axe' ? '도끼' : '곡괭이'} 없음</div>`;
            const r = t.dur / toolMaxDur(t);
            return `<div class="tool-card ${t.dur <= 0 ? 'broken' : ''}">${toolGem(k, t)}<div><b>${toolName(k, t)}</b><small>내구도 <span class="${t.dur <= 0 ? 'bad' : r < 0.2 ? 'warn' : ''}">${t.dur}/${toolMaxDur(t)}</span> · 속도 +${Math.round((toolSpeed(t) - 1) * 100)}%</small><i class="dur" style="width:${Math.round(r * 100)}%"></i></div></div>`;
          })
          .join('')}</div>
        <h3>${field?.dungeon ? '가방 속 장비' : '가방·창고의 장비'} ${selSlot ? `<small>${slotName(selSlot, p.data.currentClass)}만 · <a data-slot="">전체 보기</a></small>` : ''}</h3><ul class="list">${list || '<li class="empty">장비가 없습니다</li>'}</ul></div>`;
    } else if (tab === 'skills') {
      const quickRow = c.quick
        .map((idx, slot) => {
          const sk = idx >= 0 ? cls.skills[idx] : null;
          return `<button class="quick-slot ${sk ? 'filled' : ''} ${selSkill === undefined ? '' : 'drop'}" data-quick="${slot}"><span class="key">${slot + 1}</span><b>${sk ? sk.name : '비어 있음'}</b>${sk ? `<small>Lv.${c.skills[idx]}</small>` : ''}</button>`;
        })
        .join('');
      const rows = cls.skills
        .map((sk, i) => {
          const lv = c.skills[i] ?? 0;
          const slot = c.quick.indexOf(i);
          return `<li class="${selSkill === i ? 'sel' : ''} ${lv ? '' : 'locked'}" ${lv ? `data-skillpick="${i}"` : ''}><img class="gem ico" src="${skillIconUrl(p.data.currentClass, i)}" alt=""><div><b class="slot-no">${slot >= 0 ? `[${slot + 1}번 칸]` : ''}</b><b>${sk.name} ${lv ? `<span class="ok">Lv.${lv}</span>` : '<span class="dim">(미습득 · 교관 카엘)</span>'}</b><small>${sk.description} · MP ${sk.mp} · ${sk.cooldown}초</small></div></li>`;
        })
        .join('');
      // 궁극기: 수호자의 차원석으로 열리고, 하나를 골라 궁극기 칸(4·F키)에 둔다
      const open = p.unlockedUlts();
      const cur = p.ultIndex;
      const ultRows = ULTIMATES[p.data.currentClass]
        .map((u, i) => {
          const got = open.includes(i);
          return `<li class="${cur === i ? 'sel' : ''} ${got ? '' : 'locked'}" ${got ? `data-ult="${i}"` : ''}><img class="gem ico" src="${skillIconUrl(p.data.currentClass, 6 + i)}" alt=""><div><b>${u.name} ${cur === i ? '<span class="ok">[장착]</span>' : got ? '' : `<span class="dim">(${u.stone}-10 수호자 · Lv.${u.level})</span>`}</b><small>${got ? `Lv.${p.ultLevel(i)} · 위력 ${Math.round(ultPower(p.ultLevel(i)) * 100)}% · ` : ''}${u.description} · MP ${u.mp} · ${ultCooldown(p.ultLevel(i))}초</small></div></li>`;
        })
        .join('');
      body = `<div class="scroll">
        <h3>퀵슬롯 ${selSkill === undefined ? '' : `<small><b class="ok">${cls.skills[selSkill].name}</b> → 칸 선택</small>`}</h3>
        <div class="quick-row">${quickRow}</div>
        <h3>궁극기</h3><ul class="list">${ultRows}</ul>
        <h3>배운 스킬</h3><ul class="list">${rows}</ul></div>`;
    } else if (tab === 'stats') {
      const next = expToNext(c.level);
      const statRows = STAT_KEYS.map(
        (k) => `<div class="stat-row"><b>${STAT_INFO[k].name}</b><span class="num">${st.base[k]}${p.bestiaryStats[k] ? `<small class="gold"> (도감 +${p.bestiaryStats[k]})</small>` : ''}</span><small>${STAT_INFO[k].desc}</small>
          <button data-stat="${k}" ${c.points > 0 ? '' : 'disabled'}>+1</button><button data-stat5="${k}" ${c.points >= 5 ? '' : 'disabled'}>+5</button></div>`,
      ).join('');
      body = `<div class="scroll">
        <div class="stat-grid">
          <span>직업</span><b>${cls.name} Lv.${c.level}${c.level >= MAX_LEVEL ? ' (최고)' : ''}</b>
          <span>경험치</span><b>${c.exp} / ${next}</b>
          <span>HP</span><b>${st.maxHp}</b>
          <span>MP</span><b>${st.maxMp}</b>
          <span>${cls.damage === 'physical' ? '물리' : '마법'} 공격력</span><b>${st.atk}</b>
          <span>방어력</span><b>${st.def}</b>
          <span>치명타</span><b>${st.crit}%</b>
          <span>공격 속도</span><b>${Math.round(st.speed * 100)}%</b>
          <span>골드</span><b>${p.data.gold}</b>
          <span>차원석</span><b>${p.data.dimStones.length} / 7</b>
        </div>
        <h3>스탯 <small>남은 포인트 <b class="${c.points ? 'ok' : ''}">${c.points}</b> · 레벨업마다 5포인트</small></h3>
        <div class="stat-rows">${statRows}</div>
        ${this.transcendBlock(p)}
        <p class="hint">원정대 보너스: 모든 능력치 <b>+${p.rosterBonus}</b> (열린 직업 레벨 합 ${p.rosterLevels} · ${ROSTER_STEP}마다 +1)${p.catchUp > 1 ? ` · <b class="ok">성장 가속 경험치 ×${CATCH_UP_EXP}</b> (Lv.${p.catchUpLevel}까지)` : ''}</p>
        <h3>스킬</h3><ul class="list">${cls.skills.map((sk, i) => `<li><span class="key">${i + 1}</span><div><b>${sk.name} ${c.skills[i] ? `Lv.${c.skills[i]}` : '<span class="dim">(미습득)</span>'}</b><small>${sk.description} · MP ${sk.mp} · ${sk.cooldown}초</small></div></li>`).join('')}</ul>
      </div>`;
    } else {
      const ql = quests.activeList();
      // 왼쪽 퀘스트 알림판에 띄울지 (체크하면 보인다)
      const hidden = new Set(p.data.settings.hiddenQuests ?? []);
      const track = (id: string) => `<label class="q-track" title="알림판에 표시"><input type="checkbox" data-track="${id}" ${hidden.has(id) ? '' : 'checked'}/><span>표시</span></label>`;
      const row = (q: QuestDef) => {
        const prog = quests.progress(q);
        const done = prog.every((x) => x.cur >= x.need);
        return `<li class="quest ${q.kind}">${track(q.id)}<div><b>${q.kind === 'main' ? '[메인] ' : '[서브] '}${q.title}</b>
          <small>${prog.map((x) => `${x.text} ${x.cur}/${x.need}`).join(' · ')}</small>
          ${done ? `<small class="ok">✔ ${npcName(q.npc)}에게 보고</small>` : ''}</div></li>`;
      };
      const daily = quests.state.daily.list
        .filter((d) => d.accepted)
        .map((d) => {
          const need = objectiveNeed(d.objective);
          const cur = objectiveProgress(d.objective, d.progress, { count: (id) => p.count(id), stones: p.stoneCount, cleared: p.data.cleared, flag: (f) => p.flag(f), discovered: p.discovered });
          return `<li class="quest daily ${d.claimed ? 'claimed' : ''}">${d.claimed ? '' : track(`daily:${d.id}`)}<div><b>[일일] ${d.title}</b><small>${objectiveText(d.objective)} ${Math.min(cur, need)}/${need}</small>${d.claimed ? '<small class="dim">보상 받음</small>' : cur >= need ? '<small class="ok">✔ 촌장 에단에게 보고</small>' : ''}</div></li>`;
        })
        .join('');
      // 완료한 퀘스트: 메인(이야기 다시 보기)과 서브를 나눠서
      const doneIds = quests.state.done.filter((id) => QUEST_BY_ID[id]);
      const doneMain = doneIds.map((id) => QUEST_BY_ID[id]).filter((q) => q.kind === 'main');
      const doneSub = doneIds.map((id) => QUEST_BY_ID[id]).filter((q) => q.kind === 'sub');
      const seen = STORY_REPLAY.filter((r) => p.flag(`seen_${r.id}`) > 0 || r.seen(p));
      const mainRows = [
        ...seen.map((r) => `<li class="quest main done-q"><div><b>${r.title}</b></div><button class="small" data-replay="script:${r.id}">▶ 다시 보기</button></li>`),
        ...doneMain.map((q) => `<li class="quest main done-q"><div><b>${q.title}</b><small>${npcName(q.npc)}</small></div><button class="small" data-replay="quest:${q.id}">▶ 다시 보기</button></li>`),
      ].join('');
      const subRows = doneSub.map((q) => `<li class="quest sub done-q"><div><b>${q.title}</b><small>${npcName(q.npc)}</small></div></li>`).join('');
      body = `<div class="scroll">
        <h3>진행 중</h3><ul class="list">${ql.map(row).join('')}${daily}${!ql.length && !daily ? '<li class="empty">진행 중인 퀘스트 없음</li>' : ''}</ul>
        <h3>완료한 메인 <small>${seen.length + doneMain.length}</small></h3><ul class="list">${mainRows || '<li class="empty">없음</li>'}</ul>
        <h3>완료한 서브 <small>${doneSub.length}</small></h3><ul class="list">${subRows || '<li class="empty">없음</li>'}</ul>
      </div>`;
    }
    const s = this.open(
      'inventory',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <div class="tabs">
           <button data-tab="equip" class="${tab === 'equip' ? 'on' : ''}">장비</button>
           <button data-tab="skills" class="${tab === 'skills' ? 'on' : ''}">스킬</button>
           <button data-tab="stats" class="${tab === 'stats' ? 'on' : ''}">능력치${c.points ? ` <i class="dot">${c.points}</i>` : ''}</button>
           <button data-tab="quest" class="${tab === 'quest' ? 'on' : ''}">퀘스트</button>
         </div>
         ${body}
       </div>`,
      onClose,
    );
    const again = (t = tab, slot = selSlot, sk?: number) => this.inventory(p, quests, t, onChange, onClose, slot, field, sk);
    this.on(s, '[data-ult]', (b) => {
      c.ult = Number(b.dataset.ult);
      onChange();
      again(tab, selSlot);
    });
    this.on(s, '[data-skillpick]', (b) => {
      const i = Number(b.dataset.skillpick);
      again(tab, selSlot, selSkill === i ? undefined : i);
    });
    this.on(s, '[data-quick]', (b) => {
      const slot = Number(b.dataset.quick);
      if (selSkill !== undefined) {
        // 이미 다른 칸에 있으면 그 칸은 비우고 옮긴다
        c.quick = c.quick.map((x) => (x === selSkill ? -1 : x));
        c.quick[slot] = selSkill;
      } else c.quick[slot] = -1;
      onChange();
      again(tab, selSlot);
    });
    this.on(s, '[data-tab]', (b) => again(b.dataset.tab as typeof tab, undefined));
    this.on(s, '[data-replay]', (b) => {
      const [kind, id] = b.dataset.replay!.split(':');
      const steps = kind === 'script' ? SCRIPTS[id] : [...QUEST_BY_ID[id].offer, ...QUEST_BY_ID[id].complete];
      // 대사·장면 제목만 다시 본다 (선택지·보상·플래그는 건너뛴다)
      const replay = (steps ?? []).filter((x) => 't' in x || 'title' in x || 'fx' in x);
      this.onReplay?.(replay, () => again('quest', undefined));
    });
    s.querySelectorAll<HTMLInputElement>('[data-track]').forEach((el) =>
      el.addEventListener('change', () => {
        const id = el.dataset.track!;
        const set = new Set(p.data.settings.hiddenQuests ?? []);
        if (el.checked) set.delete(id);
        else set.add(id);
        p.data.settings.hiddenQuests = [...set];
        onChange();
      }),
    );
    this.on(s, '[data-slot]', (b) => {
      this.click();
      const slot = (b.dataset.slot || undefined) as EquipSlot | undefined;
      again(tab, slot === selSlot ? undefined : slot);
    });
    this.on(s, '[data-eq]', (b) => {
      if (field && field.bags.some((bg) => bg.equips().some((x) => x.uid === b.dataset.eq))) {
        // 가방 칸의 장비와 끼고 있던 장비를 맞바꾼다
        for (const bag of field.bags) {
          const i = bag.slots.findIndex((x) => x?.equip?.uid === b.dataset.eq);
          if (i < 0) continue;
          const e = bag.slots[i]!.equip!;
          const prev = c.equipment[e.slot];
          bag.slots[i] = prev ? { itemId: 'equip', count: 1, equip: prev } : null;
          c.equipment[e.slot] = e;
          break;
        }
        onChange();
        return again();
      }
      const e = p.data.equips.find((x) => x.uid === b.dataset.eq);
      if (e) p.equip(e);
      onChange();
      again();
    });
    this.on(s, '[data-un]', (b) => {
      const slot = b.dataset.un as EquipSlot;
      if (field?.dungeon) {
        const e = c.equipment[slot];
        if (e && field.bags.some((bag) => bag.addEquip(e))) delete c.equipment[slot];
        else if (e) alert('가방에 빈 칸이 없습니다');
        onChange();
        return again();
      }
      p.unequip(slot);
      onChange();
      again();
    });
    this.on(s, '[data-stat]', (b) => {
      p.allocate(b.dataset.stat as StatKey, 1);
      onChange();
      again();
    });
    this.on(s, '[data-stat5]', (b) => {
      p.allocate(b.dataset.stat5 as StatKey, 5);
      onChange();
      again();
    });
    this.on(s, '[data-tp]', (b) => {
      if (!p.spendTranscend(b.dataset.tp as BonusKey, Number(b.dataset.n ?? 1))) return;
      onChange();
      again();
    });
  }

  /** 능력치 탭: 초월(99레벨 뒤)과 각인·칭호·음식 보너스 합계 */
  private transcendBlock(p: Progress): string {
    const c = p.cls;
    const bo = p.bonuses();
    const sum = (Object.entries(bo) as [BonusKey, number][]).filter(([, v]) => v).map(([k, v]) => bonusText(k, v)).join(' · ');
    const food = p.data.food && p.data.food.until > Date.now() ? `${ITEMS[p.data.food.id]?.name ?? ''} ${Math.ceil((p.data.food.until - Date.now()) / 60000)}분 남음` : '없음';
    let html = `<h3>추가 보너스</h3><p class="hint">${sum || '없음'}<br>음식: ${food}</p>`;
    if (c.level < MAX_LEVEL) return html;
    const pts = p.transcendPoints();
    const need = transcendExp(c.tlv ?? 0);
    const spent = p.transcendSpent();
    const shards = p.count('dim_shard');
    const c1 = transcendCost(spent, 1);
    const c5 = transcendCost(spent, 5);
    html += `<h3>초월 Lv.${c.tlv ?? 0} <small>경험치 ${c.texp ?? 0} / ${need} · 남은 초월 포인트 <b class="${pts ? 'ok' : ''}">${pts}</b></small></h3>
      <p class="hint">1점당 ${inlineGem('dim_shard')}${c1} · 보유 <b class="${shards >= c1 ? '' : 'bad'}">${shards}</b></p>
      <div class="stat-rows">${TRANSCEND_STATS.map((t) => `<div class="stat-row"><b>${BONUS_NAMES[t.key]}</b><span class="num">${c.tpts?.[t.key] ?? 0}</span><small>1포인트당 ${bonusText(t.key, t.per)}</small>
        <button data-tp="${t.key}" data-n="1" ${pts > 0 && shards >= c1 ? '' : 'disabled'}>+1 <small>(파편 ${c1})</small></button><button data-tp="${t.key}" data-n="5" ${pts >= 5 && shards >= c5 ? '' : 'disabled'}>+5 <small>(파편 ${c5})</small></button></div>`).join('')}</div>`;
    return html;
  }

  // ---------------- 공유 창고: 가방 ⇄ 창고 ----------------
  storage(p: Progress, onClose: () => void, message?: string, onChange?: () => void): void {
    type Sel = { from: 'bag' | 'dim'; i: number } | { from: 'store'; id: string } | { from: 'storeEq'; uid: string } | null;
    let sel: Sel = null;
    let info = message ?? '';
    const bag = p.invBag;
    const dim = p.dimBagObj;
    const render = () => {
      const cell = (x: Slot | null, from: 'bag' | 'dim', i: number) => {
        if (!x) return '<div class="slot"></div>';
        const on = sel && sel.from === from && sel.i === i ? 'sel' : '';
        return `<div class="slot filled ${on}" data-from="${from}" data-i="${i}">${x.equip ? equipGem(x.equip) : itemGem(x.itemId)}<span class="cnt">${x.equip ? `+${x.equip.plus}` : x.count}</span></div>`;
      };
      // 한 칸에 99개씩 나눠 보여 준다
      const storeItems = ITEM_LIST.filter((it) => p.stored(it.id) > 0)
        .flatMap((it) => stacks(p.stored(it.id)).map((n) => `<div class="slot filled ${sel?.from === 'store' && sel.id === it.id ? 'sel' : ''}" data-store="${it.id}">${itemGem(it.id)}<span class="cnt">${n}</span></div>`))
        .join('');
      const used = p.storageUsed;
      const cap = p.storageCapacity;
      const lv = p.data.storageLevel ?? 1;
      const up = p.storageUpgrade;
      const upOk = !!up && p.data.gold >= up.gold && p.hasAll(up.items);
      const upTxt = up ? `${up.gold} G · ${Object.entries(up.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${n}</span>`).join(' ')}` : '';
      // 던전에 들고 가는 가방 확장 (2칸씩, 최대 40칸)
      const bup = p.bagUpgrade;
      const bupOk = !!bup && p.data.gold >= bup.gold && p.hasAll(bup.items);
      const bagBtn = bup
        ? `<button class="tool-sm" data-a="bagup" ${bupOk ? '' : 'disabled'}>가방 확장 ${p.bagLevel}/${BAG_MAX_LEVEL} → ${bag.slots.length + BAG_STEP}칸 · ${bup.gold} G · ${Object.entries(bup.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${n}</span>`).join(' ')}</button>`
        : '<small class="ok">가방 최대 (40칸)</small>';
      const emptyCells = Array.from({ length: Math.max(0, Math.min(cap - used, 40)) }, () => '<div class="slot"></div>').join('');
      const storeEq = p.data.equips
        .map((e) => `<div class="slot filled ${sel?.from === 'storeEq' && sel.uid === e.uid ? 'sel' : ''}" data-storeeq="${e.uid}">${equipGem(e)}<span class="cnt">+${e.plus}</span></div>`)
        .join('');
      const toStore = sel && (sel.from === 'bag' || sel.from === 'dim');
      const toBag = sel && (sel.from === 'store' || sel.from === 'storeEq');
      const sc = this.open(
        'storage',
        `<div class="panel wide tall">
           <button class="close">${ICONS.close}</button>
           <h2>공유 창고 <small>Lv.${lv}/${STORAGE_MAX_LEVEL}</small> <small class="${used > cap ? 'bad' : ''}">${used}/${cap}칸 · 한 칸 ${STORE_STACK}개</small> <button class="tool-sm" data-a="all">재료 모두 창고로</button> ${up ? `<button class="tool-sm" data-a="expand" ${upOk ? '' : 'disabled'}>Lv.${lv + 1} 업그레이드 (${storageSlotsFor(lv + 1)}칸) · ${upTxt}</button>` : '<small class="ok">최대 레벨</small>'}</h2>
           ${used > cap ? '<div class="notice warn-box">창고가 넘쳤습니다. 넘친 칸은 꺼내기만 할 수 있고, 새로 넣으려면 비우거나 업그레이드하세요.</div>' : ''}
           <div class="item-info">${info}</div>
           <div class="store-split scroll">
             <div>
               <h3>가방 <small>${bag.used}/${bag.slots.length}</small> ${bagBtn}</h3>
               <div class="bag-grid inv-grid ${toBag ? 'drop' : ''}" data-grid="bag">${bag.slots.map((x, i) => cell(x, 'bag', i)).join('')}</div>
               <h3>차원가방 <small>${dim.used}/${dim.slots.length}</small></h3>
               <div class="bag-grid inv-grid ${toBag ? 'drop' : ''}" data-grid="dim">${dim.slots.map((x, i) => cell(x, 'dim', i)).join('')}</div>
             </div>
             <div>
               <h3>창고 <small>${used > cap ? '<span class="bad">칸이 넘쳤습니다 — 비우거나 확장하세요</span>' : `빈 칸 ${cap - used}`}</small></h3>
               <div class="store-grid ${toStore ? 'drop' : ''}" data-grid="store">${storeItems}${storeEq}${emptyCells}</div>
             </div>
           </div>
         </div>`,
        onClose,
      );
      sc.querySelectorAll<HTMLElement>('[data-grid]').forEach((grid) =>
        grid.addEventListener('click', (ev) => {
          const el = (ev.target as HTMLElement).closest<HTMLElement>('.slot.filled');
          const g = grid.dataset.grid as 'bag' | 'dim' | 'store';
          // 선택한 것이 있고 반대쪽을 누르면 옮긴다
          if (sel && g === 'store' && (sel.from === 'bag' || sel.from === 'dim')) {
            const b = sel.from === 'bag' ? bag : dim;
            const x = b.slots[sel.i];
            if (x) {
              if (x.equip) {
                if (p.storageHasSlot) {
                  p.data.equips.push(x.equip);
                  b.slots[sel.i] = null;
                  info = `${equipName(x.equip)} → 창고`;
                } else info = '<span class="bad">창고에 빈 칸이 없습니다 (확장하세요)</span>';
              } else {
                const k = p.depositItem(x.itemId, x.count);
                x.count -= k;
                if (x.count <= 0) b.slots[sel.i] = null;
                info = k ? `${ITEMS[x.itemId].name} ×${k} → 창고${x.count > 0 ? ` <span class="bad">(칸이 모자라 ${x.count}개는 가방에)</span>` : ''}` : '<span class="bad">창고에 빈 칸이 없습니다 (확장하세요)</span>';
              }
            }
            sel = null;
            this.click();
            return render();
          }
          if (sel && g !== 'store' && (sel.from === 'store' || sel.from === 'storeEq')) {
            const b = g === 'bag' ? bag : dim;
            if (sel.from === 'store') {
              const id = sel.id;
              const n = b.add(id, p.stored(id));
              if (n > 0) {
                p.data.storage[id] -= n;
                if (p.data.storage[id] <= 0) delete p.data.storage[id];
                info = `${ITEMS[id].name} ×${n} → ${g === 'bag' ? '가방' : '차원가방'}`;
              } else info = '<span class="bad">가방에 빈 칸이 없습니다</span>';
            } else {
              const uid = sel.uid;
              const e = p.data.equips.find((x) => x.uid === uid);
              if (e && b.addEquip(e)) {
                p.data.equips = p.data.equips.filter((x) => x.uid !== uid);
                info = `${equipName(e)} → ${g === 'bag' ? '가방' : '차원가방'}`;
              } else info = '<span class="bad">가방에 빈 칸이 없습니다</span>';
            }
            sel = null;
            this.click();
            return render();
          }
          if (!el) return;
          this.click();
          if (el.dataset.store) {
            const id = el.dataset.store;
            sel = sel?.from === 'store' && sel.id === id ? null : { from: 'store', id };
            info = sel ? `${slotInfo({ itemId: id, count: p.stored(id) })}<br><small class="ok">→ 가방</small>` : info;
          } else if (el.dataset.storeeq) {
            const e = p.data.equips.find((x) => x.uid === el.dataset.storeeq)!;
            sel = sel?.from === 'storeEq' && sel.uid === e.uid ? null : { from: 'storeEq', uid: e.uid };
            info = sel ? `${slotInfo({ itemId: 'equip', count: 1, equip: e })}<br><small class="ok">→ 가방</small>` : info;
          } else {
            const from = el.dataset.from as 'bag' | 'dim';
            const i = Number(el.dataset.i);
            const same = sel && (sel.from === 'bag' || sel.from === 'dim') && sel.from === from && sel.i === i;
            sel = same ? null : { from, i };
            info = sel ? `${slotInfo((from === 'bag' ? bag : dim).slots[i]!)}<br><small class="ok">→ 창고</small>` : info;
          }
          render();
        }),
      );
      this.on(sc, '[data-a="all"]', () => {
        let n = 0;
        let left = 0;
        for (const b of [bag, dim])
          b.slots.forEach((x, i) => {
            // 물약·귀환석·음식 같은 소모품은 가방에 남긴다
            if (!x || x.equip || ITEMS[x.itemId]?.kind === 'consumable') return;
            const k = p.depositItem(x.itemId, x.count);
            n += k;
            x.count -= k;
            left += x.count;
            if (x.count <= 0) b.slots[i] = null;
          });
        sel = null;
        info = n ? `재료 ${n}개를 창고에 넣었습니다${left ? ` <span class="bad">(칸이 모자라 ${left}개는 가방에)</span>` : ''}` : left ? '<span class="bad">창고에 빈 칸이 없습니다</span>' : '넣을 재료가 없습니다';
        render();
      });
      this.on(sc, '[data-a="bagup"]', () => {
        if (!p.upgradeBag()) return;
        info = `<b class="ok">가방이 ${p.data.inventory.length}칸이 되었습니다</b>`;
        onChange?.();
        render();
      });
      this.on(sc, '[data-a="expand"]', () => {
        const c = p.storageUpgrade;
        if (!c || p.data.gold < c.gold || !p.hasAll(c.items)) return;
        p.data.gold -= c.gold;
        p.takeAll(c.items);
        p.data.storageLevel = (p.data.storageLevel ?? 1) + 1;
        info = `<b class="ok">공유 창고 Lv.${p.data.storageLevel}! ${p.storageCapacity}칸이 되었습니다</b>`;
        onChange?.();
        render();
      });
    };
    render();
  }

  // ---------------- 차원집 일반 창고 ----------------
  /** 차원집 안의 일반 창고는 모두 하나의 보관함. 가방 또는 공유 창고와 주고받는다 */
  warehouse(p: Progress, b: BuildingState, onChange: () => void, onClose: () => void, side: 'bag' | 'shared' = 'bag', message?: string): void {
    type Sel = { from: 'bag' | 'dim'; i: number } | { from: 'shared' | 'home'; id: string } | null;
    let sel: Sel = null;
    let info = message ?? '';
    const bag = p.invBag;
    const dim = p.dimBagObj;
    const render = () => {
      const cap = p.homeCapacity;
      const used = p.homeUsed;
      const cell = (x: Slot | null, from: 'bag' | 'dim', i: number) => {
        if (!x) return '<div class="slot"></div>';
        if (x.equip) return `<div class="slot filled dim-eq">${equipGem(x.equip)}</div>`;
        const on = sel && sel.from === from && sel.i === i ? 'sel' : '';
        return `<div class="slot filled ${on}" data-from="${from}" data-i="${i}">${itemGem(x.itemId)}<span class="cnt">${x.count}</span></div>`;
      };
      const pool = (r: Record<string, number>, from: 'shared' | 'home') =>
        ITEM_LIST.filter((it) => (r[it.id] ?? 0) > 0)
          .flatMap((it) => stacks(r[it.id]).map((n) => `<div class="slot filled ${sel && 'id' in sel && sel.from === from && sel.id === it.id ? 'sel' : ''}" data-${from}="${it.id}">${itemGem(it.id)}<span class="cnt">${n}</span></div>`))
          .join('');
      const empty = Array.from({ length: Math.max(0, Math.min(cap - used, 40)) }, () => '<div class="slot"></div>').join('');
      const left =
        side === 'bag'
          ? `<h3>가방 <small>${bag.used}/${bag.slots.length}</small></h3><div class="bag-grid inv-grid" data-grid="bag">${bag.slots.map((x, i) => cell(x, 'bag', i)).join('')}</div>
             <h3>차원가방 <small>${dim.used}/${dim.slots.length}</small></h3><div class="bag-grid inv-grid" data-grid="dim">${dim.slots.map((x, i) => cell(x, 'dim', i)).join('')}</div>`
          : `<h3>공유 창고 <small>${p.storageUsed}/${p.storageCapacity}칸</small></h3><div class="store-grid" data-grid="shared">${pool(p.data.storage, 'shared') || '<p class="hint">비어 있음</p>'}</div>`;
      const sc = this.open(
        'storage',
        `<div class="panel wide tall">
           <button class="close">${ICONS.close}</button>
           <h2>일반 창고 <small class="${used > cap ? 'bad' : ''}">${used}/${cap}칸 · 한 칸 ${STORE_STACK}개</small> <button class="tool-sm" data-a="all">재료 모두 넣기</button></h2>
           ${this.levelBlock(b, p)}
           <div class="tabs"><button data-side="bag" class="${side === 'bag' ? 'on' : ''}">가방과 주고받기</button><button data-side="shared" class="${side === 'shared' ? 'on' : ''}">공유 창고와 주고받기</button></div>
           <div class="item-info">${info}</div>
           <div class="store-split scroll">
             <div>${left}</div>
             <div>
               <h3>일반 창고</h3>
               <div class="store-grid" data-grid="home">${pool(p.home, 'home')}${empty}</div>
             </div>
           </div>
         </div>`,
        onClose,
      );
      const moveToHome = (id: string, n: number) => p.addHome(id, n);
      sc.querySelectorAll<HTMLElement>('[data-grid]').forEach((grid) =>
        grid.addEventListener('click', (ev) => {
          const el = (ev.target as HTMLElement).closest<HTMLElement>('.slot.filled');
          const g = grid.dataset.grid as 'bag' | 'dim' | 'shared' | 'home';
          if (sel && g === 'home' && sel.from !== 'home') {
            if (sel.from === 'shared') {
              const id = sel.id;
              const k = moveToHome(id, p.stored(id));
              if (k) {
                p.data.storage[id] -= k;
                if (p.data.storage[id] <= 0) delete p.data.storage[id];
              }
              info = k ? `${ITEMS[id].name} ×${k} → 일반 창고` : '<span class="bad">일반 창고에 빈 칸이 없습니다</span>';
            } else if ('i' in sel) {
              const si = sel.i;
              const bb = sel.from === 'bag' ? bag : dim;
              const x = bb.slots[si];
              if (x && !x.equip) {
                const k = moveToHome(x.itemId, x.count);
                x.count -= k;
                if (x.count <= 0) bb.slots[si] = null;
                info = k ? `${ITEMS[x.itemId].name} ×${k} → 일반 창고` : '<span class="bad">일반 창고에 빈 칸이 없습니다</span>';
              }
            }
            sel = null;
            this.click();
            onChange();
            return render();
          }
          if (sel && sel.from === 'home' && g !== 'home') {
            const id = sel.id;
            const have = p.homeStored(id);
            let k = 0;
            if (g === 'shared') k = p.depositItem(id, have);
            else k = (g === 'bag' ? bag : dim).add(id, have);
            p.takeHome(id, k);
            info = k ? `${ITEMS[id].name} ×${k} → ${g === 'shared' ? '공유 창고' : g === 'bag' ? '가방' : '차원가방'}` : '<span class="bad">빈 칸이 없습니다</span>';
            sel = null;
            this.click();
            onChange();
            return render();
          }
          if (!el) return;
          this.click();
          if (el.dataset.home) {
            const id = el.dataset.home;
            sel = sel && 'id' in sel && sel.from === 'home' && sel.id === id ? null : { from: 'home', id };
            info = sel ? `${slotInfo({ itemId: id, count: p.homeStored(id) })}<br><small class="ok">→ 꺼내기</small>` : info;
          } else if (el.dataset.shared) {
            const id = el.dataset.shared;
            sel = sel && 'id' in sel && sel.from === 'shared' && sel.id === id ? null : { from: 'shared', id };
            info = sel ? `${slotInfo({ itemId: id, count: p.stored(id) })}<br><small class="ok">→ 일반 창고</small>` : info;
          } else if (el.dataset.from) {
            const from = el.dataset.from as 'bag' | 'dim';
            const i = Number(el.dataset.i);
            sel = sel && 'i' in sel && sel.from === from && sel.i === i ? null : { from, i };
            info = sel ? `${slotInfo((from === 'bag' ? bag : dim).slots[i]!)}<br><small class="ok">→ 일반 창고</small>` : info;
          }
          render();
        }),
      );
      this.on(sc, '[data-side]', (el) => this.warehouse(p, b, onChange, onClose, el.dataset.side as 'bag' | 'shared'));
      this.on(sc, '[data-a="all"]', () => {
        let n = 0;
        let left = 0;
        if (side === 'bag')
          for (const bb of [bag, dim])
            bb.slots.forEach((x, i) => {
              if (!x || x.equip || ITEMS[x.itemId]?.kind === 'consumable') return;
              const k = moveToHome(x.itemId, x.count);
              n += k;
              x.count -= k;
              left += x.count;
              if (x.count <= 0) bb.slots[i] = null;
            });
        else
          for (const [id, have] of Object.entries(p.data.storage)) {
            const k = moveToHome(id, have);
            n += k;
            left += have - k;
            p.data.storage[id] -= k;
            if (p.data.storage[id] <= 0) delete p.data.storage[id];
          }
        sel = null;
        info = n ? `재료 ${n}개를 일반 창고에 넣었습니다${left ? ` <span class="bad">(칸이 모자라 ${left}개는 그대로)</span>` : ''}` : '넣을 재료가 없거나 빈 칸이 없습니다';
        onChange();
        render();
      });
      this.bindUpgrade(sc, b, p, () => {
        onChange();
        render();
      });
    };
    render();
  }

  // ---------------- 퀘스트 제안 ----------------
  /** NPC와 대화: 인사말을 보여 주고, 이야기·퀘스트·시설 중에서 고른다 */
  npcTalk(name: string, greeting: string, options: { label: string; kind: 'story' | 'report' | 'offer' | 'pending' | 'service' | 'leave'; pick: () => void }[], onClose: () => void): void {
    const mark = { story: '💬', report: '✔', offer: '!', pending: '…', service: '▸', leave: '' } as const;
    const btn = (o: (typeof options)[number], i: number) => `<button class="talk-opt ${o.kind}" data-opt="${i}"><i>${mark[o.kind]}</i><span>${o.label}</span></button>`;
    // 퀘스트·이야기는 스크롤되는 목록, 시설·대화 끝내기는 아래에 고정
    const rows = options.map((o, i) => (o.kind === 'service' || o.kind === 'leave' ? '' : btn(o, i))).join('');
    const fixed = options.map((o, i) => (o.kind === 'service' || o.kind === 'leave' ? btn(o, i) : '')).join('');
    const s = this.open(
      'npc-talk',
      `<div class="panel talk-panel">
         <button class="close">${ICONS.close}</button>
         <h2>${esc(name)}</h2>
         <p class="talk-line">${richText(esc(greeting))}</p>
         ${rows ? `<div class="talk-opts scroll">${rows}</div>` : ''}
         <div class="talk-fixed">${fixed}</div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-opt]', (b) => options[Number(b.dataset.opt)].pick());
  }

  questOffer(q: QuestDef, onAccept: () => void, onClose: () => void): void {
    const obj = q.objectives.map((o) => `<li><span class="key">▸</span><div><b>${objectiveText(o)}</b><small>${o.type === 'clear' ? '' : `${objectiveNeed(o)}${o.type === 'deliver' || o.type === 'gather' || o.type === 'craft' ? '개' : o.type === 'build' ? '개 설치' : '마리'}`}</small></div></li>`).join('');
    const r = q.rewards;
    const rewards = [r.gold ? `${r.gold} G` : '', r.exp ? `경험치 ${r.exp}` : '', ...Object.entries(r.items ?? {}).map(([id, n]) => `${inlineGem(id)}${ITEMS[id].name} ×${n}`)].filter(Boolean).join(' · ');
    const s = this.open(
      'quest-offer',
      `<div class="panel">
         <button class="close">${ICONS.close}</button>
         <h2>${q.kind === 'main' ? '[메인] ' : '[서브] '}${q.title}</h2>
         <ul class="list">${obj}</ul>
         <p class="hint">보상: ${rewards || '없음'}</p>
         <div class="menu"><button class="primary" data-a="accept">수락하기</button></div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-a="accept"]', onAccept);
  }

  /** 촌장의 일일 의뢰 게시판 */
  dailyBoard(p: Progress, quests: Quests, onClaim: (i: number) => void, onAccept: (i: number) => void, onClose: () => void): void {
    const ctx = { count: (id: string) => p.count(id), stones: p.stoneCount, cleared: p.data.cleared, flag: (f: string) => p.flag(f), discovered: p.discovered };
    const rows = quests.state.daily.list
      .map((d, i) => {
        const need = objectiveNeed(d.objective);
        const cur = Math.min(need, objectiveProgress(d.objective, d.progress, ctx));
        const r = d.reward;
        const reward = [r.gold ? `${r.gold} G` : '', r.exp ? `경험치 ${r.exp}` : '', ...Object.entries(r.items ?? {}).map(([id, n]) => `${ITEMS[id].name}×${n}`)].filter(Boolean).join(' · ');
        const btn = d.claimed
          ? '<button disabled>완료</button>'
          : !d.accepted
            ? `<button data-accept="${i}">수락</button>`
            : `<button data-claim="${i}" ${cur < need ? 'disabled' : ''}>${cur < need ? '진행 중' : '완료 보고'}</button>`;
        return `<li class="${d.accepted && !d.claimed ? 'sel' : ''}"><div><b>${d.title}</b><small>${objectiveText(d.objective)} ${d.accepted ? `${cur}/${need}` : `(목표 ${need})`}</small><small class="dim">보상: ${reward}</small></div>${btn}</li>`;
      })
      .join('');
    const s = this.open(
      'daily',
      `<div class="panel wide">
         <button class="close">${ICONS.close}</button>
         <h2>촌장의 일일 의뢰</h2>
         <ul class="list">${rows}</ul>
       </div>`,
      onClose,
    );
    this.on(s, '[data-claim]', (b) => onClaim(Number(b.dataset.claim)));
    this.on(s, '[data-accept]', (b) => onAccept(Number(b.dataset.accept)));
  }

  /** 상점 개수 입력 창: 패널 위에 겹쳐 띄운다 */
  private qtyPicker(s: HTMLElement, o: { title: string; unit: number; max: number; verb: string; onOk: (n: number) => void; summary?: (n: number) => string }): void {
    s.querySelector('.qty-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'qty-pop';
    pop.innerHTML = `<div class="qty-box">
        <h3>${esc(o.title)}</h3>
        <div class="qty-row">
          <button data-d="-10">−10</button><button data-d="-1">−</button>
          <input type="number" inputmode="numeric" min="1" max="${o.max}" value="1" />
          <button data-d="1">+</button><button data-d="10">+10</button>
        </div>
        <div class="qty-row small"><button data-set="1">1개</button><button data-set="${o.max}">최대 ${o.max}</button></div>
        <p class="qty-total"></p>
        <div class="menu two"><button class="primary" data-ok>${o.verb}</button><button data-no>취소</button></div>
      </div>`;
    (s.querySelector('.panel') ?? s).appendChild(pop);
    const input = pop.querySelector('input')!;
    const total = pop.querySelector<HTMLElement>('.qty-total')!;
    const val = () => Math.max(1, Math.min(o.max, Math.floor(Number(input.value) || 1)));
    const show = () => (total.innerHTML = o.summary ? o.summary(val()) : `${val()}개 × ${o.unit} G = <b class="gold">${val() * o.unit} G</b>`);
    const set = (n: number) => {
      input.value = String(Math.max(1, Math.min(o.max, n)));
      show();
    };
    input.addEventListener('input', show);
    input.addEventListener('change', () => set(val()));
    this.on(pop, '[data-d]', (b) => set(val() + Number(b.dataset.d)));
    this.on(pop, '[data-set]', (b) => set(Number(b.dataset.set)));
    this.on(pop, '[data-no]', () => pop.remove());
    this.on(pop, '[data-ok]', () => o.onOk(val()));
    pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    pop.addEventListener('pointerup', (e) => e.stopPropagation());
    show();
  }

  // ---------------- 몬스터 도감 ----------------
  /** canClaim: 연구자 노아 앞에서만 보상을 받을 수 있다 (다른 곳에서는 보기만) */
  bestiary(p: Progress, canClaim: boolean, onChange: () => void, onClose: () => void, tier = 1, message?: string): void {
    const found = p.discovered;
    const research = p.data.research ?? 0;
    const claimed = (id: string) => p.data.bestiaryClaim?.[id] ?? 0;
    const giveText = (r: BestiaryReward) => [r.gold ? `${r.gold} G` : '', ...Object.entries(r.items).map(([id, n]) => `${ITEMS[id].name}×${n}`)].filter(Boolean).join(' · ');
    // 8장(v10) 몬스터는 8번 탭 (8장이 열려야 보인다)
    const tabThemes = [...THEMES.map((t) => ({ tier: t.tier, color: t.portalColor })), ...(p.flag('ch8') ? [{ tier: 8, color: CH8_THEME.portalColor }] : [])];
    const tabs = tabThemes.map((t) => {
      const list = BESTIARY.filter((e) => e.tier === t.tier);
      const got = list.filter((e) => p.kills(e.species.id) > 0).length;
      const ready = list.some((e) => killMilestones(e).some((m, i) => i >= claimed(e.species.id) && p.kills(e.species.id) >= m));
      return `<button class="tier-tab ${t.tier === tier ? 'on' : ''}" data-tier="${t.tier}" style="--c:${hex(t.color)}"><b>${t.tier}</b><small>${got}/${list.length}</small>${ready && canClaim ? '<i class="dot"></i>' : ''}</button>`;
    }).join('');
    const cards = BESTIARY.filter((e) => e.tier === tier)
      .map((e) => {
        const sp = e.species;
        const n = p.kills(sp.id);
        const known = n > 0;
        const url = monsterIconUrl(sp, e.tier, e.rank !== 'normal');
        const ms = killMilestones(e);
        const c = claimed(sp.id);
        const chips = ms
          .map((m, i) => {
            const r = milestoneReward(e, i);
            const done = i < c;
            const ready = !done && n >= m;
            return `<div class="bm ${done ? 'done' : ready ? 'ready' : ''}"><span>${m}${e.rank === 'normal' ? '마리' : '번'}</span><small>${giveText(r)}</small>${ready ? `<button data-claim="${sp.id}" ${canClaim ? '' : 'disabled'}>${canClaim ? '받기' : '노아에게'}</button>` : done ? '<b class="ok">받음</b>' : ''}</div>`;
          })
          .join('');
        const sm = statMilestone(e);
        const statText = sm.stat === 'all' ? `모든 능력치 +${sm.gain}` : `${STAT_INFO[sm.stat].name} +${sm.gain}`;
        const statChip = `<div class="bm stat ${n >= sm.kills ? 'done' : ''}"><span>${sm.kills}${e.rank === 'normal' ? '마리' : '번'}</span><small>영구 ${statText}</small>${n >= sm.kills ? '<b class="ok">달성</b>' : `<small class="dim">${Math.min(n, sm.kills)}/${sm.kills}</small>`}</div>`;
        const tags = [
          e.rank === 'boss' ? '<b class="bad">수호자</b>' : e.rank === 'midboss' ? '<b class="gold">파수꾼</b>' : '',
          known ? FACTION_NAME[sp.faction] : '',
          known ? ARCH_NAME[sp.arch] : '',
        ].filter(Boolean).join(' · ');
        const notes = known
          ? [sp.trait ? `<small class="trait">특성: ${TRAIT_TEXT[sp.trait]}</small>` : '', sp.debuff ? `<small class="debuff">약화: ${DEBUFF_INFO[sp.debuff.id].name} (${DEBUFF_INFO[sp.debuff.id].text})</small>` : '', sp.pack ? `<small class="dim">무리 지어 다님 (${sp.pack}마리)</small>` : ''].join('')
          : '<small class="dim">아직 쓰러뜨린 적 없음</small>';
        return `<li class="beast ${known ? '' : 'unknown'}">
            <img class="beast-img" src="${url}" alt="">
            <div class="beast-info"><b>${known ? sp.name : '???'}</b> <small class="dim">처치 ${n}</small><small>${tags}</small>${notes}<div class="bms">${chips}${statChip}</div></div>
          </li>`;
      })
      .join('');
    const bst = p.bestiaryStats;
    const masterList = BESTIARY.filter((e) => e.tier === tier && e.rank === 'normal');
    const masterGot = masterList.filter((e) => p.kills(e.species.id) >= SPECIES_STAT_KILLS).length;
    const master = isStageMaster(tier, (id) => p.kills(id));
    const cols = COLLECTION_MILESTONES.map((m, i) => {
      const done = i < research;
      const ready = !done && found >= m.count;
      return `<div class="bm ${done ? 'done' : ready ? 'ready' : ''}"><span>${m.count}종</span><small>${giveText(m.reward)} · 연구 +${Math.round(RESEARCH_BONUS * 100)}%</small>${ready ? `<button data-col="${i}" ${canClaim && i === research ? '' : 'disabled'}>${canClaim ? '받기' : '노아에게'}</button>` : done ? '<b class="ok">받음</b>' : ''}</div>`;
    }).join('');
    const s = this.open(
      'bestiary',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>몬스터 도감 <small>발견 ${found}/${BESTIARY.length} · 연구 보너스 공격력·체력 +${Math.round(research * RESEARCH_BONUS * 100)}%</small></h2>
         <div class="notice">도감 영구 능력치: ${STAT_KEYS.map((k) => `${STAT_INFO[k].name} +${bst[k]}`).join(' · ')}</div>
         ${message ? `<div class="notice">${message}</div>` : ''}
         
         <div class="scroll">
           <h3>수집 보상</h3>
           <div class="bms wide">${cols}</div>
           <div class="tier-tabs">${tabs}</div>
           <div class="bm stat ${master ? 'done' : ''}"><span>${tier}단계 마스터</span><small>이 단계 일반 몬스터를 모두 ${SPECIES_STAT_KILLS}마리씩 (${masterGot}/${masterList.length}종) → 영구 모든 능력치 +${MASTER_ALL_GAIN}</small>${master ? '<b class="ok">달성</b>' : ''}</div>
           <ul class="list beasts">${cards}</ul>
         </div>
       </div>`,
      onClose,
    );
    const again = (t = tier, msg?: string) => this.bestiary(p, canClaim, onChange, onClose, t, msg);
    this.on(s, '[data-tier]', (b) => again(Number(b.dataset.tier)));
    const give = (r: BestiaryReward) => {
      p.data.gold += r.gold;
      for (const [id, n] of Object.entries(r.items)) p.add(id, n);
    };
    this.on(s, '[data-claim]', (b) => {
      if (!canClaim) return;
      const id = b.dataset.claim!;
      const e = BESTIARY_BY_ID[id];
      const i = claimed(id);
      if (!e || p.kills(id) < killMilestones(e)[i]) return;
      const r = milestoneReward(e, i);
      give(r);
      (p.data.bestiaryClaim ??= {})[id] = i + 1;
      onChange();
      again(tier, `<b class="ok">${e.species.name} 연구 보상: ${giveText(r)}</b>`);
    });
    this.on(s, '[data-col]', (b) => {
      if (!canClaim) return;
      const i = Number(b.dataset.col);
      const m = COLLECTION_MILESTONES[i];
      if (i !== research || !m || found < m.count) return;
      give(m.reward);
      p.data.research = research + 1;
      onChange();
      again(tier, `<b class="ok">수집 보상 ${m.count}종: ${giveText(m.reward)} · 연구 보너스 +${Math.round((research + 1) * RESEARCH_BONUS * 100)}%</b>`);
    });
  }

  // ---------------- 상점 ----------------
  shop(p: Progress, onChange: () => void, onClose: () => void, tab: 'buy' | 'sell' = 'buy', toast?: string): void {
    const goods: { id: string; label: string; price: number; make: () => void; equip?: Equip }[] = [
      { id: 'potion', label: '치유 물약', price: 30, make: () => p.add('potion', 1) },
      { id: 'return_stone', label: '귀환석', price: 80, make: () => p.add('return_stone', 1) },
    ];
    const t = Math.max(1, Math.min(3, p.maxTier - 1));
    for (const slot of EQUIP_SLOTS) {
      const e: Equip = { uid: `shop-${slot}`, slot, cls: slot === 'weapon' ? p.data.currentClass : undefined, tier: t, grade: 0, plus: 0 };
      goods.push({
        id: `eq-${slot}`,
        label: equipName(e),
        equip: e,
        price: equipValue(e) * 4,
        make: () => p.data.equips.push({ ...e, uid: `${Date.now()}${slot}${Math.random()}` }),
      });
    }
    let body = '';
    if (tab === 'buy') {
      body = `<ul class="list scroll">${goods
        .map((g, i) => `<li>${g.equip ? equipGem(g.equip) : itemGem(g.id)}<div><b>${esc(g.label)}</b><small>${g.equip ? `기본 장비 · ${equipLine(g.equip)}` : ITEMS[g.id].description}</small></div><button data-buy="${i}" ${p.data.gold >= g.price ? '' : 'disabled'}>${g.price} G</button></li>`)
        .join('')}</ul>`;
    } else {
      const items = ITEM_LIST.filter((i) => p.count(i.id) > 0 && i.value > 0)
        .map((i) => {
          const inBag = p.count(i.id) - p.stored(i.id);
          return `<li>${itemGem(i.id)}<div><b>${i.name} <span class="dim">× ${p.count(i.id)}</span></b><small>개당 ${i.value} G · 창고 ${p.stored(i.id)}${inBag ? ` · 가방 ${inBag}` : ''}</small></div><button data-sell="${i.id}">팔기</button></li>`;
        })
        .join('');
      // 창고 장비 + 가방·차원가방 장비
      const bagEquips = [p.invBag, p.dimBagObj].flatMap((b) => b.equips());
      const eqs = [...p.data.equips, ...bagEquips]
        .map((e) => `<li>${equipGem(e)}<div>${equipTitle(e)}<small>${bagEquips.includes(e) ? '<span class="ok">[가방]</span> ' : '<span class="dim">[창고]</span> '}${equipLine(e)}</small></div><button data-selleq="${e.uid}">${equipValue(e)} G</button></li>`)
        .join('');
      // 등급별로 장비 한꺼번에 팔기 (두 번 눌러 확인)
      const all = [...p.data.equips, ...bagEquips];
      const byGrade = GRADES.map((g, gi) => ({ g, gi, list: all.filter((e) => e.grade === gi && !e.set) })).filter((x) => x.list.length);
      const gradeRow = byGrade.length
        ? `<div class="sell-grades">${byGrade.map((x) => `<button data-sellgr="${x.gi}" style="--c:${hex(x.g.color)}"><b style="color:${hex(x.g.color)}">${x.g.name}</b> 모두 팔기<small>${x.list.length}개 · ${x.list.reduce((a, e) => a + equipValue(e), 0).toLocaleString()} G</small></button>`).join('')}</div>`
        : '';
      body = `${gradeRow}<ul class="list scroll">${items}${eqs}${!items && !eqs ? '<li class="empty">팔 물건이 없습니다</li>' : ''}</ul>`;
    }
    const s = this.open(
      'shop',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>상인 무트의 가게 <small class="gold">${p.data.gold.toLocaleString()} G</small></h2>
         <div class="tabs"><button data-tab="buy" class="${tab === 'buy' ? 'on' : ''}">사기</button><button data-tab="sell" class="${tab === 'sell' ? 'on' : ''}">팔기</button></div>
         ${toast ? `<div class="notice">${toast}</div>` : ''}
         ${body}
       </div>`,
      onClose,
    );
    const again = (tb = tab, msg?: string) => {
      onChange();
      this.shop(p, onChange, onClose, tb, msg);
    };
    this.on(s, '[data-tab]', (b) => again(b.dataset.tab as typeof tab));
    this.on(s, '[data-buy]', (b) => {
      const g = goods[Number(b.dataset.buy)];
      const max = Math.min(99, Math.floor(p.data.gold / g.price));
      if (max < 1) return;
      this.qtyPicker(s, { title: `${g.label} 사기`, unit: g.price, max, verb: '사기', onOk: (n) => {
        if (p.data.gold < g.price * n) return;
        p.data.gold -= g.price * n;
        for (let k = 0; k < n; k++) g.make();
        again(tab, `${g.label} ${n}개 구입 −${g.price * n} G`);
      } });
    });
    this.on(s, '[data-sell]', (b) => {
      const id = b.dataset.sell!;
      const max = p.count(id);
      if (max < 1) return;
      this.qtyPicker(s, { title: `${ITEMS[id].name} 팔기`, unit: ITEMS[id].value, max, verb: '팔기', onOk: (n) => {
        n = Math.min(n, p.count(id));
        if (n > 0 && p.take(id, n)) p.data.gold += ITEMS[id].value * n;
        again(tab, `${ITEMS[id].name} ${n}개 판매 +${ITEMS[id].value * n} G`);
      } });
    });
    this.on(s, '[data-sellgr]', (b) => {
      const gi = Number(b.dataset.sellgr);
      if (!b.classList.contains('confirm')) {
        b.classList.add('confirm');
        const sm = b.querySelector('small');
        if (sm) sm.textContent = '한 번 더 누르면 판매';
        return;
      }
      let n = 0;
      let gold = 0;
      const sell = (e: Equip) => {
        n++;
        gold += equipValue(e);
      };
      p.data.equips = p.data.equips.filter((e) => (e.grade === gi && !e.set ? (sell(e), false) : true));
      for (const bag of [p.invBag, p.dimBagObj])
        bag.slots.forEach((x, i) => {
          if (x?.equip && x.equip.grade === gi && !x.equip.set) {
            sell(x.equip);
            bag.slots[i] = null;
          }
        });
      p.data.gold += gold;
      again(tab, `${GRADES[gi].name} 장비 ${n}개 판매 +${gold.toLocaleString()} G`);
    });
    this.on(s, '[data-selleq]', (b) => {
      const uid = b.dataset.selleq;
      let e = p.data.equips.find((x) => x.uid === uid);
      if (e) p.data.equips = p.data.equips.filter((x) => x !== e);
      else
        for (const bag of [p.invBag, p.dimBagObj]) {
          const i = bag.slots.findIndex((x) => x?.equip?.uid === uid);
          if (i >= 0) {
            e = bag.slots[i]!.equip;
            bag.slots[i] = null;
            break;
          }
        }
      if (!e) return;
      p.data.gold += equipValue(e);
      again(tab, `${equipName(e)} 판매 +${equipValue(e)} G`);
    });
  }

  /** 세라의 도면 상점 */
  blueprints(p: Progress, onBuy: (t: BuildingType) => void, onClose: () => void, message?: string, onBuyUpgrade?: (t: BuildingType, level: number) => void): void {
    // 강화 도면: 건물을 가진 뒤, 다음 레벨 도면 하나씩. 그 단계 던전을 열어야 판다
    const upRows = UPGRADABLE.filter((t) => !BUILDINGS[t].blueprint || p.flag(`bp_${t}`) > 0)
      .map((t) => {
        let lv = 2;
        while (lv <= MAX_BUILDING_LEVEL && p.flag(`bp_${t}_lv${lv}`)) lv++;
        const d = BUILDINGS[t];
        const thumb = buildingThumb(t);
        const icon = thumb ? `<img class="gem ico" src="${thumb}" alt="">` : '';
        if (lv > MAX_BUILDING_LEVEL) return `<li>${icon}<div><b>${d.name} 강화 도면</b><small class="ok">모든 레벨 도면 보유</small></div></li>`;
        const cost = upgradeBlueprintCost(t, lv);
        const opened = p.maxTier >= lv;
        const ok = opened && p.data.gold >= cost.gold && p.hasAll(cost.items);
        const costTxt = [`${cost.gold} G`, ...Object.entries(cost.items).map(([id, n]) => `${ITEMS[id].name} ${p.count(id)}/${n}`)].join(' · ');
        return `<li>${icon}<div><b>${d.name} Lv.${lv} 강화 도면</b><small>${t === 'generator' ? `전력 ${generatorPower(lv)}` : t === 'warehouse' ? `창고 하나당 ${warehouseSlots(lv)}칸` : `${TOOL_TIER_NAMES[lv - 1]} 단계 재료를 가공 · 속도 ×${levelSpeed(lv).toFixed(2)}`}</small><small class="dim">${opened ? costTxt : `${lv}단계 차원문을 열면 판매`}</small></div><button data-up="${t}:${lv}" ${ok ? '' : 'disabled'}>구입</button></li>`;
      })
      .join('');
    const rows = BUILD_ORDER.filter((t) => BUILDINGS[t].blueprint)
      .map((t) => {
        const d = BUILDINGS[t];
        const bp = d.blueprint!;
        const owned = p.flag(`bp_${t}`) > 0;
        const cost = [`${bp.gold} G`, ...Object.entries(bp.items).map(([id, n]) => `${ITEMS[id].name} ${p.count(id)}/${n}`)].join(' · ');
        const req = PRODUCER_TYPES.has(t) ? PRODUCER_UNLOCK[t as ProducerType] : null;
        const reqOk = !req || (req === 'clear7' ? p.data.cleared >= 70 : p.flag('endgame') > 0);
        const ok = !owned && reqOk && p.data.gold >= bp.gold && p.hasAll(bp.items);
        const thumb = buildingThumb(t);
        const limit = PRODUCER_TYPES.has(t) ? ` · 최대 ${PRODUCER_LIMIT[t as ProducerType]}개` : '';
        const lockTxt = req === 'clear7' ? '7-10 수호자를 쓰러뜨리면 판매' : '이야기를 모두 마치면 판매';
        return `<li>${thumb ? `<img class="gem ico" src="${thumb}" alt="">` : `<span class="gem" style="--c:${hex(d.color)}"></span>`}<div><b>${d.name} 도면${limit}</b><small class="dim">${owned ? '보유 중' : reqOk ? cost : `🔒 ${lockTxt}`}</small></div><button data-bp="${t}" ${ok ? '' : 'disabled'}>${owned ? '보유' : '구입'}</button></li>`;
      })
      .join('');
    const s = this.open(
      'blueprints',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>세라의 도면 <small class="gold">${p.data.gold.toLocaleString()} G</small></h2>
         ${message ? `<div class="notice">${message}</div>` : ''}
         <div class="scroll">
         <h3>건물 도면</h3>
         <ul class="list">${rows}</ul>
         <h3>강화 도면</h3>
         <ul class="list">${upRows}</ul>
         </div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-bp]', (b) => onBuy(b.dataset.bp as BuildingType));
    this.on(s, '[data-up]', (b) => {
      const [t, lv] = b.dataset.up!.split(':');
      onBuyUpgrade?.(t as BuildingType, Number(lv));
    });
  }

  // ---------------- 대장간 (강화 · 수리) ----------------
  forge(p: Progress, onChange: () => void, onClose: () => void, selected?: string, message?: string): void {
    const c = p.cls;
    const worn = Object.values(c.equipment).filter(Boolean) as Equip[];
    // 착용 · 가방 · 차원가방 · 창고의 모든 장비
    const inBags = [p.invBag, p.dimBagObj].flatMap((b) => b.equips());
    const all: Equip[] = [...worn, ...inBags, ...p.data.equips];
    const tools = p.data.tools;
    const toolRows = (['pickaxe', 'axe'] as const)
      .filter((k) => p.flag(k === 'axe' ? 'tool_axe' : 'tool_pickaxe'))
      .map((k) => `<li class="${selected === `tool:${k}` ? 'sel' : ''}" data-pick="tool:${k}">${toolGem(k, tools[k])}<div><b>${toolName(k, tools[k])}</b><small>내구도 <span class="${tools[k].dur <= 0 ? 'bad' : ''}">${tools[k].dur}/${toolMaxDur(tools[k])}</span></small></div></li>`)
      .join('');
    const selTool = selected?.startsWith('tool:') ? (selected.slice(5) as 'pickaxe' | 'axe') : null;
    const sel = selTool ? undefined : (all.find((e) => e.uid === selected) ?? all[0]);
    const durTxt = (e: Equip) => `<span class="${durability(e) <= 0 ? 'bad' : durability(e) < 30 ? 'warn' : 'dim'}">내구 ${durability(e)}</span>`;
    const list = all
      .map((e) => `<li class="${e === sel ? 'sel' : ''}" data-pick="${e.uid}">${equipGem(e)}<div>${equipTitle(e)}<small>${equipLine(e) || '<span class="bad">망가짐</span>'} · ${durTxt(e)}${worn.includes(e) ? ' · 착용 중' : inBags.includes(e) ? ' · 가방' : ' · 창고'}</small></div></li>`)
      .join('');
    const costLine = (ore: string, count: number, gold: number) => {
      const have = p.count(ore);
      return `<p>${inlineGem(ore)}${ITEMS[ore].name} ${count}개 <span class="${have >= count ? 'dim' : 'bad'}">(창고 ${have})</span> · ${gold} G</p>`;
    };
    let detail = '<p class="hint">장비가 없습니다.</p>';
    if (selTool) {
      const t = tools[selTool];
      const cost = toolRepair(t);
      detail = `<p><b>${toolName(selTool, t)}</b> · 내구도 ${t.dur}/${toolMaxDur(t)}</p>
        <p class="hint">캐는 속도 +${Math.round((toolSpeed(t) - 1) * 100)}% · 추가 채집 ${Math.round(toolBonusChance(t) * 100)}%</p>`;
      if (cost) {
        const ok = p.data.gold >= cost.gold;
        detail += `<h3>수리</h3><p><span class="${ok ? '' : 'bad'}">${cost.gold.toLocaleString()} G</span></p><div class="menu"><button data-repair-tool="${selTool}" ${ok ? '' : 'disabled'}>수리하기</button></div>`;
      }
      const ec = toolEnhanceCost(t);
      if (ec) {
        const ok = p.count(ec.ore) >= ec.count && p.data.gold >= ec.gold;
        detail += `<h3>강화 → +${t.plus + 1}</h3>${costLine(ec.ore, ec.count, ec.gold)}<p>성공 확률 <b>${Math.round(ec.rate * 100)}%</b></p><div class="menu"><button class="primary" data-enh-tool="${selTool}" ${ok ? '' : 'disabled'}>강화하기</button></div>`;
      } else detail += '<p class="hint">최대 강화(+10)입니다.</p>';
    } else if (sel) {
      const cost = enhanceCost(sel);
      detail = `<p>${equipTitle(sel)}</p>${equipDetail(sel)}<p class="hint">내구도 ${durability(sel)}/${EQUIP_MAX_DUR}</p>`;
      const rc = repairCost(sel);
      if (rc) {
        const ok = p.count(rc.ore) >= rc.count && p.data.gold >= rc.gold;
        detail += `<h3>수리</h3>${costLine(rc.ore, rc.count, rc.gold)}<div class="menu"><button data-repair ${ok ? '' : 'disabled'}>수리하기</button></div>`;
      }
      if (!cost) detail += '<p class="hint">이미 최대 강화(+10)입니다.</p>';
      else {
        const next = { ...sel, plus: sel.plus + 1 };
        const have = p.count(cost.item);
        const ok = have >= cost.count && p.data.gold >= cost.gold;
        detail += `<h3>강화 → +${next.plus}</h3>
          <p class="hint">→ ${equipBase({ ...next, dur: EQUIP_MAX_DUR })}${durability(sel) <= 0 ? " (수리 후)" : ""}</p>
          <p>${inlineGem(cost.item)}${ITEMS[cost.item].name} ${cost.count}개 <span class="${have >= cost.count ? 'dim' : 'bad'}">(보유 ${have})</span></p>
          <p>${cost.gold} G · 성공 확률 <b>${Math.round(cost.rate * 100)}%</b></p>
          <div class="menu"><button class="primary" data-enh ${ok ? '' : 'disabled'}>강화하기</button></div>`;
      }
      detail += this.engraveBlock(p, sel);
      detail += this.specialBlock(p, sel);
    }
    const s = this.open(
      'forge',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>대장장이 고른의 대장간 <small class="gold">${p.data.gold.toLocaleString()} G</small></h2>
         ${message ? `<div class="notice">${message}</div>` : ''}
         <div class="split"><ul class="list pick scroll">${toolRows}${list || '<li class="empty">장비 없음</li>'}</ul><div class="detail">${detail}</div></div>
       </div>`,
      onClose,
    );
    const again = (id?: string, msg?: string) => this.forge(p, onChange, onClose, id, msg);
    this.on(s, '[data-pick]', (el) => again(el.dataset.pick));
    this.on(s, '[data-repair-tool]', (b) => {
      const k = b.dataset.repairTool as 'pickaxe' | 'axe';
      const cost = toolRepair(tools[k]);
      if (!cost || p.data.gold < cost.gold) return;
      p.data.gold -= cost.gold;
      tools[k].dur = toolMaxDur(tools[k]);
      again(`tool:${k}`, '<b class="ok">수리 완료!</b>');
    });
    this.on(s, '[data-enh-tool]', (b) => {
      const k = b.dataset.enhTool as ToolKind;
      const t = tools[k];
      const ec = toolEnhanceCost(t);
      if (!ec || p.count(ec.ore) < ec.count || p.data.gold < ec.gold) return;
      p.take(ec.ore, ec.count);
      p.data.gold -= ec.gold;
      const ok = Math.random() < ec.rate;
      if (ok) {
        t.plus++;
        t.dur = Math.min(toolMaxDur(t), t.dur + 10);
      }
      again(`tool:${k}`, ok ? `<b class="ok">강화 성공! ${toolName(k, t)}</b>` : '<b class="bad">강화 실패…</b>');
    });
    this.on(s, '[data-repair]', () => {
      if (!sel) return;
      const rc = repairCost(sel);
      if (!rc || p.count(rc.ore) < rc.count || p.data.gold < rc.gold) return;
      p.take(rc.ore, rc.count);
      p.data.gold -= rc.gold;
      sel.dur = EQUIP_MAX_DUR;
      onChange();
      again(sel.uid, '<b class="ok">수리 완료!</b>');
    });
    this.on(s, '[data-eng]', (b) => {
      if (!sel) return;
      const stage = Number(b.dataset.eng);
      const lines = (sel.eng ??= []);
      if (stage > lines.length + 1 || stage > ENGRAVE_STAGES) return;
      const cost = engraveCost(stage);
      if (p.data.gold < cost.gold || !p.hasAll(cost.items)) return;
      p.data.gold -= cost.gold;
      p.takeAll(cost.items);
      const line = rollEngrave(stage, mathRng);
      const old = lines[stage - 1];
      lines[stage - 1] = line;
      onChange();
      again(sel.uid, `<b class="ok">${ENGRAVE_STAGE_NAMES[stage - 1]} 각인: ${bonusText(line.k, line.v)}</b>${old ? ` <span class="dim">(이전: ${bonusText(old.k, old.v)})</span>` : ''}`);
    });
    this.on(s, '[data-splock]', (b) => {
      if (!sel) return;
      const i = Number(b.dataset.splock);
      const set = this.spLocks.get(sel.uid) ?? new Set<number>();
      if (set.has(i)) set.delete(i);
      else if (set.size < (sel.sp?.length ?? 0) - 1) set.add(i);
      this.spLocks.set(sel.uid, set);
      again(sel.uid);
    });
    this.on(s, '[data-spre]', () => {
      if (!sel?.sp?.length || !p.flag('endgame')) return;
      const locked = [...(this.spLocks.get(sel.uid) ?? [])];
      const cost = specialRerollCost(sel.grade, sel.tier, locked.length);
      if (p.data.gold < cost.gold || !p.hasAll(cost.items)) return;
      p.data.gold -= cost.gold;
      p.takeAll(cost.items);
      sel.sp = rollSpecials(sel, new Rng((Math.random() * 2 ** 32) >>> 0), locked);
      onChange();
      again(sel.uid, `<b class="ok">특수 옵션: ${sel.sp.map((l, i) => (locked.includes(i) ? `<span class="dim">${specialText(l)}</span>` : specialText(l))).join(' / ')}</b>`);
    });
    this.on(s, '[data-enh]', () => {
      if (!sel) return;
      const cost = enhanceCost(sel)!;
      if (p.count(cost.item) < cost.count || p.data.gold < cost.gold) return;
      p.take(cost.item, cost.count);
      p.data.gold -= cost.gold;
      const success = Math.random() < cost.rate;
      if (success) sel.plus++;
      onChange();
      again(sel.uid, success ? `<b class="ok">강화 성공! +${sel.plus}</b>` : '<b class="bad">강화 실패…</b>');
    });
  }

  // ---------------- v10: 무한 러쉬 축복 고르기 (고를 때까지 닫히지 않는다) ----------------
  blessPick(opts: { id: string; name: string; text: string; color: number; lv: number; max: number }[], onPick: (id: string | null) => void, onClose?: () => void): void {
    const s = this.open(
      'bless',
      `<div class="panel bless-panel">
         <h2>✦ 축복을 고르세요</h2>
         <div class="bless-row">${
           opts.length
             ? opts
                 .map(
                   (o) =>
                     `<button class="bless-card" data-bless="${o.id}" style="--c:${hex(o.color)}"><b style="color:${hex(o.color)}">${o.name}</b><small class="dim">Lv.${o.lv} → ${o.lv + 1} / ${o.max}</small><span>${o.text}</span></button>`,
                 )
                 .join('')
             : '<button class="bless-card" data-bless="">체력 50% 회복<br><small class="dim">모든 축복을 최고 단계로 올렸습니다</small></button>'
         }</div>
       </div>`,
      onClose,
    );
    s.dataset.locked = '1';
    this.on(s, '[data-bless]', (b) => {
      delete s.dataset.locked;
      onPick(b.dataset.bless || null);
    });
  }

  // ---------------- v10: 업적 ----------------
  achievements(p: Progress, ctx: AchCtx, onClaim: (id: string) => void, onClose: () => void): void {
    const done = p.data.ach?.done ?? [];
    const rows = ACHIEVEMENTS.map((a) => {
      const v = a.value(ctx);
      const got = done.includes(a.id);
      const ready = !got && v >= a.goal;
      const pct = Math.min(100, Math.round((v / Math.max(1, a.goal)) * 100));
      return { a, got, ready, html: `<li class="${got ? 'dim' : ''}"><span class="gem" style="--c:${got ? '#6a6a7a' : ready ? '#ffd86a' : '#8a8aa0'}"></span><div><b>${a.name}${a.title ? ` <small style="color:#ffd86a">칭호 「${a.title}」</small>` : ''}</b><small>${a.desc} · ${Math.min(v, a.goal).toLocaleString()}/${a.goal.toLocaleString()} (${pct}%)</small></div>${got ? '<button disabled>받음</button>' : `<button data-ach="${a.id}" ${ready ? 'class="primary"' : 'disabled'}>${inlineGem(MARK)} ${a.marks}</button>`}</li>` };
    });
    // 받을 수 있는 것 → 진행 중 → 받은 것
    rows.sort((x, y) => Number(y.ready) - Number(x.ready) || Number(x.got) - Number(y.got));
    const nGot = rows.filter((r) => r.got).length;
    const s = this.open(
      'shop',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>업적 <small class="gold">${nGot}/${ACHIEVEMENTS.length} · ${inlineGem(MARK)} ${p.count(MARK)}</small></h2>
         <p class="hint">업적을 달성하면 영겁의 증표를 받습니다 (???에게서 유물 파편·세트 문장으로 교환). 몇몇 업적은 칭호도 줍니다.</p>
         <ul class="list scroll">${rows.map((r) => r.html).join('')}</ul>
       </div>`,
      onClose,
    );
    this.on(s, '[data-ach]', (b) => onClaim(b.dataset.ach!));
  }

  // ---------------- v10: 차원 계약 (소환사, 노아) ----------------
  pacts(p: Progress, onChange: () => void, onClose: () => void, message?: string): void {
    const sm = p.data.classes.summoner;
    const eligible = new Set(p.pactEligible());
    const chosen = (sm.pacts ?? []).filter((id) => eligible.has(id));
    const active = p.activePacts();
    const rows = BESTIARY.filter((e) => e.rank === 'normal' && p.kills(e.species.id) > 0)
      .sort((a, b) => p.kills(b.species.id) - p.kills(a.species.id))
      .map((e) => {
        const id = e.species.id;
        const k = p.kills(id);
        const ok = eligible.has(id);
        const awk = k >= PACT_AWAKEN_KILLS;
        const on = chosen.includes(id);
        const ranged = ['ranged', 'archer', 'caster', 'necro', 'shaman', 'spitter'].includes(e.species.arch);
        const url = monsterIconUrl(e.species, Math.min(7, e.tier), false);
        return `<li class="${ok ? '' : 'locked'} ${on ? 'sel' : ''}"><img class="gem ico" src="${url}" alt=""><div><b>${e.species.name}${awk ? ' <small style="color:#ffd86a">각성 계약</small>' : ''}</b><small>처치 ${k.toLocaleString()}${ok ? '' : ` / ${PACT_KILLS}`} · ${ranged ? '원거리' : '근접'}${awk ? ' · 위력 ×1.5 · 몸집 ×1.25' : ok ? ` · 1000마리면 각성 계약` : ''}</small></div>${ok ? `<button data-pact="${id}" class="${on ? 'primary' : ''}" ${!on && chosen.length >= 3 ? 'disabled' : ''}>${on ? '계약 중' : '계약하기'}</button>` : ''}</li>`;
      })
      .join('');
    const s = this.open(
      'shop',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>노아 · 차원 계약 <small class="gold">계약할 수 있는 종족 ${eligible.size}</small></h2>
         <div class="scroll">
         <p class="hint">차원 소환사의 「계약 소환」은 도감에서 <b>${PACT_KILLS}마리 이상</b> 잡은 종족을 불러냅니다 (원거리 종족은 마력탄을 쏜다). 셋까지 고를 수 있고, 고르지 않으면 가장 많이 잡은 셋을 씁니다. <b>${PACT_AWAKEN_KILLS}마리</b>를 넘기면 각성 계약 (위력 ×1.5). 계약할 수 있는 종족 하나마다 소환수 위력 +1% (최대 +60%, 지금 +${Math.min(60, eligible.size)}%). 도감은 모든 직업이 함께 씁니다.</p>
         <p>지금 부르는 계약: ${active.length ? active.map((id) => `<b>${SPECIES[id]?.name ?? id}</b>`).join(' · ') : '<span class="dim">없음 (차원 늑대를 부른다)</span>'}</p>
         ${message ? `<div class="notice">${message}</div>` : ''}
         <ul class="list">${rows || '<li class="empty">아직 잡은 몬스터가 없습니다</li>'}</ul>
         </div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-pact]', (b) => {
      const id = b.dataset.pact!;
      const list = (sm.pacts = chosen.slice());
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else if (list.length < 3) list.push(id);
      onChange();
      this.pacts(p, onChange, onClose);
    });
  }

  // ---------------- v10: ??? 증표 교환 ----------------
  exchange(p: Progress, onChange: () => void, onClose: () => void, message?: string): void {
    const have = p.count(MARK);
    const rows = EXCHANGE.map(
      (o, i) =>
        `<li>${itemGem(o.item)}<div><b>${ITEMS[o.item].name} × ${o.n} <small class="dim">보유 ${p.count(o.item)}</small></b><small>${o.note}</small></div><button data-ex="${i}" ${have >= o.cost ? '' : 'disabled'}>${inlineGem(MARK)} ${o.cost}</button></li>`,
    ).join('');
    const s = this.open(
      'shop',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>??? · 증표 교환 <small class="gold">${inlineGem(MARK)} 영겁의 증표 ${have}</small></h2>
         <div class="scroll">
         <p class="hint">"틈새가 기억하는 것들이다. 증표를 가져오면 나누어 주지." — 영겁의 증표는 일일 차원 시련·주간 차원 레이드·무한 러쉬·업적에서 얻습니다. 유물 파편은 몬스터 연구자 노아가 유물로 복원하고, 문장은 대장장이 고른이 세트 장비로 만들어 줍니다.</p>
         ${message ? `<div class="notice">${message}</div>` : ''}
         <ul class="list">${rows}</ul>
         </div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-ex]', (b) => {
      const o = EXCHANGE[Number(b.dataset.ex)];
      if (!o || !p.take(MARK, o.cost)) return;
      p.add(o.item, o.n);
      onChange();
      this.exchange(p, onChange, onClose, `<b class="ok">${ITEMS[o.item].name} ${o.n}개를 받았습니다</b>`);
    });
  }

  // ---------------- v10: 유물 (노아) ----------------
  relics(p: Progress, onChange: () => void, onClose: () => void, message?: string, selected?: string): void {
    const list = (p.data.relics ??= []);
    const eq = (p.cls.relics ??= []);
    const worn = eq.map((u) => list.find((r) => r.uid === u)).filter((r): r is Relic => !!r);
    const icon = (r: Relic) => `<span class="gem" style="--c:${hex(RELIC_BY_ID[r.id]?.color ?? 0xffffff)};outline:2px solid ${hex(RELIC_GRADES[r.g].color)};border-radius:50%"></span>`;
    const lineTxt = (r: Relic) =>
      r.lines
        .map((l) => {
          const [lo, hi] = relicRange(l.k, r.g);
          const pctIn = hi > lo ? Math.round(((l.v - lo) / (hi - lo)) * 100) : 100;
          return `${specialText(l)} <span class="dim">(${Math.max(0, Math.min(100, pctIn))}%)</span>`;
        })
        .join(' · ');
    const title = (r: Relic) => `<b style="color:${hex(RELIC_GRADES[r.g].color)}">[${RELIC_GRADES[r.g].name}] ${RELIC_BY_ID[r.id]?.name ?? '유물'}</b>`;
    const sorted = [...list].sort((a, b) => b.g - a.g || a.id.localeCompare(b.id));
    const sel = list.find((r) => r.uid === selected) ?? null;
    const slots = Array.from({ length: RELIC_SLOTS }, (_, i) => {
      const r = worn[i];
      return r ? `<li class="${sel === r ? 'sel' : ''}" data-rpick="${r.uid}">${icon(r)}<div>${title(r)}<small>${lineTxt(r)}</small></div></li>` : `<li class="empty">빈 유물 칸 ${i + 1}</li>`;
    }).join('');
    const rows = sorted
      .filter((r) => !eq.includes(r.uid))
      .map((r) => `<li class="${sel === r ? 'sel' : ''}" data-rpick="${r.uid}">${icon(r)}<div>${title(r)}<small>${lineTxt(r)}</small></div></li>`)
      .join('');
    const shards = p.count('relic_shard');
    const canCraft = shards >= RELIC_CRAFT_SHARDS && p.data.gold >= RELIC_CRAFT_GOLD && list.length < RELIC_MAX;
    let detail = '';
    if (sel) {
      const isOn = eq.includes(sel.uid);
      const sameKind = worn.find((r) => r.id === sel.id && r.uid !== sel.uid);
      detail = `<div class="notice">${title(sel)} — ${lineTxt(sel)}
        <div class="menu row">${
          isOn
            ? `<button data-roff="${sel.uid}">장착 해제</button>`
            : `<button class="primary" data-ron="${sel.uid}" ${worn.length >= RELIC_SLOTS && !sameKind ? 'disabled' : ''}>${sameKind ? '같은 종류와 바꾸기' : '장착'}</button><button data-rdis="${sel.uid}">분해 (파편 +${RELIC_GRADES[sel.g].refund})</button>`
        }</div></div>`;
    }
    const s = this.open(
      'shop',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>노아 · 유물 복원 <small class="gold">${p.data.gold.toLocaleString()} G · ${inlineGem('relic_shard')} ${shards}</small></h2>
         <div class="scroll">
           <p class="hint">유물 파편 ${RELIC_CRAFT_SHARDS}개 + ${RELIC_CRAFT_GOLD.toLocaleString()} G → 무작위 유물 (14종 · ${RELIC_GRADES.map((g) => `<span style="color:${hex(g.color)}">${g.name}</span>`).join('·')}). 직업마다 ${RELIC_SLOTS}개 장착, 같은 종류는 하나만.</p>
           ${message ? `<div class="notice">${message}</div>` : ''}
           <div class="menu row"><button class="primary" data-rcraft ${canCraft ? '' : 'disabled'}>유물 복원 (파편 ${shards}/${RELIC_CRAFT_SHARDS})</button></div>
           ${detail}
           <h3>${CLASSES[p.data.currentClass].name}의 유물 (${worn.length}/${RELIC_SLOTS})</h3>
           <ul class="list pick">${slots}</ul>
           <h3>보관 중 (${list.length - worn.length}) <small class="dim">최대 ${RELIC_MAX}개 · 눌러서 장착·분해</small></h3>
           <ul class="list pick">${rows || '<li class="empty">유물이 없습니다</li>'}</ul>
         </div>
       </div>`,
      onClose,
    );
    const again = (msg?: string, sl?: string) => this.relics(p, onChange, onClose, msg, sl);
    this.on(s, '[data-rpick]', (b) => again(undefined, b.dataset.rpick));
    this.on(s, '[data-rcraft]', () => {
      if (p.count('relic_shard') < RELIC_CRAFT_SHARDS || p.data.gold < RELIC_CRAFT_GOLD || list.length >= RELIC_MAX) return;
      p.take('relic_shard', RELIC_CRAFT_SHARDS);
      p.data.gold -= RELIC_CRAFT_GOLD;
      const r = rollRelic(Math.random, newUid());
      list.push(r);
      p.achAdd('relics');
      if (r.g >= 4) p.achAdd('mythic');
      onChange();
      again(`<b class="ok">복원 성공!</b> ${title(r)} — ${lineTxt(r)}`, r.uid);
    });
    this.on(s, '[data-ron]', (b) => {
      const r = list.find((x) => x.uid === b.dataset.ron);
      if (!r) return;
      const same = eq.findIndex((u) => list.find((x) => x.uid === u)?.id === r.id);
      if (same >= 0) eq[same] = r.uid;
      else if (eq.length < RELIC_SLOTS) eq.push(r.uid);
      else return;
      onChange();
      again(`${title(r)} 장착`, r.uid);
    });
    this.on(s, '[data-roff]', (b) => {
      p.cls.relics = eq.filter((u) => u !== b.dataset.roff);
      onChange();
      again('장착을 해제했습니다', b.dataset.roff);
    });
    this.on(s, '[data-rdis]', (b) => {
      const r = list.find((x) => x.uid === b.dataset.rdis);
      if (!r) return;
      if (!b.classList.contains('confirm')) {
        b.classList.add('confirm');
        b.textContent = '한 번 더 누르면 분해';
        return;
      }
      // 다른 직업이 장착 중이면 거기서도 뺀다
      for (const c of Object.values(p.data.classes)) if (c.relics) c.relics = c.relics.filter((u) => u !== r.uid);
      p.data.relics = list.filter((x) => x !== r);
      p.add('relic_shard', RELIC_GRADES[r.g].refund);
      onChange();
      again(`${relicName(r)} 분해 → 유물 파편 ${RELIC_GRADES[r.g].refund}개`);
    });
  }

  /** 대장간 특수 옵션 고정 (장비 uid → 고정한 줄 번호) */
  private spLocks = new Map<string, Set<number>>();

  /** 대장간: 특수 옵션 보기와 다시 굴리기 (다시 굴리기는 엔딩 뒤). 줄을 고정하면 비용이 크게 오른다 */
  private specialBlock(p: Progress, e: Equip): string {
    if (!e.sp?.length) return '';
    const locks = this.spLocks.get(e.uid) ?? new Set<number>();
    const canLock = e.sp.length > 1;
    const rows = e.sp
      .map((l, i) => {
        const [lo, hi] = specialRange(l.k, e.grade, e.tier);
        const pctIn = hi > lo ? Math.round(((l.v - lo) / (hi - lo)) * 100) : 100;
        const on = locks.has(i);
        const lockBtn = canLock && p.flag('endgame') ? `<button class="sp-lock ${on ? 'on' : ''}" data-splock="${i}" ${!on && locks.size >= e.sp!.length - 1 ? 'disabled' : ''}>${on ? '🔒 고정' : '🔓'}</button>` : '';
        return `<div class="sp-row ${on ? 'locked' : ''}"><span><b>◆ ${specialText(l)}</b> <small class="dim">범위 안 ${Math.max(0, Math.min(100, pctIn))}%</small></span>${lockBtn}</div>`;
      })
      .join('');
    let reroll = '';
    if (p.flag('endgame')) {
      const c = specialRerollCost(e.grade, e.tier, locks.size);
      const ok = p.data.gold >= c.gold && p.hasAll(c.items);
      const items = Object.entries(c.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ');
      reroll = `<div class="eng-line"><small class="dim"><span class="${p.data.gold >= c.gold ? '' : 'bad'}">${c.gold.toLocaleString()} G</span> · ${items}</small></div>
        <div class="menu"><button class="primary" data-spre ${ok ? '' : 'disabled'}>특수 옵션 다시 굴리기${locks.size ? ` (${locks.size}줄 고정)` : ''}</button></div>`;
    } else reroll = '<p class="hint">특수 옵션 다시 굴리기는 이야기를 모두 끝낸 뒤 열립니다.</p>';
    return `<h3>${SPK('anvil', '⚒')} 특수 옵션</h3>${rows}${reroll}`;
  }

  /** 대장간: 각인 (엔딩 뒤). 1단부터 차례로 새기고, 새긴 줄은 같은 비용으로 몇 번이든 다시 굴릴 수 있다 */
  private engraveBlock(p: Progress, e: Equip): string {
    if (!p.flag('endgame')) return '';
    const lines = e.eng ?? [];
    const costTxt = (stage: number) => {
      const c = engraveCost(stage);
      const items = Object.entries(c.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ');
      return `<span class="${p.data.gold >= c.gold ? '' : 'bad'}">${c.gold} G</span> · ${items}`;
    };
    const can = (stage: number) => {
      const c = engraveCost(stage);
      return p.data.gold >= c.gold && p.hasAll(c.items);
    };
    let rows = '';
    for (let i = 1; i <= ENGRAVE_STAGES; i++) {
      const l = lines[i - 1];
      if (l) {
        const [lo, hi] = engraveRange(l.k, i);
        const pct = hi > lo ? Math.round(((l.v - lo) / (hi - lo)) * 100) : 100;
        rows += `<div class="eng-line"><span class="stage">${ENGRAVE_STAGE_NAMES[i - 1]}</span><b>${bonusText(l.k, l.v)}</b><small class="dim">(범위 안 ${pct}%)</small><button data-eng="${i}" ${can(i) ? '' : 'disabled'}>다시 굴리기</button></div><div class="eng-line"><small class="dim">${costTxt(i)}</small></div>`;
      } else if (i === lines.length + 1) {
        rows += `<div class="eng-line"><span class="stage">${ENGRAVE_STAGE_NAMES[i - 1]}</span><button class="primary" data-eng="${i}" ${can(i) ? '' : 'disabled'}>${ENGRAVE_STAGE_NAMES[i - 1]} 각인 새기기</button></div><div class="eng-line"><small class="dim">${costTxt(i)}</small></div>`;
      } else rows += `<div class="eng-line empty"><span class="stage">${ENGRAVE_STAGE_NAMES[i - 1]}</span><small>🔒</small></div>`;
    }
    return `<h3>${SPK('anvil', '⚒')} 각인</h3>${rows}`;
  }

  // ---------------- 교관: 스킬 배우기·강화 ----------------
  skillShop(p: Progress, onBuy: (i: number) => void, onClose: () => void, message?: string, onUlt?: (i: number) => void, onAwaken?: (key: string, branch: AwakenBranch | null) => void): void {
    const c = p.cls;
    const cls = CLASSES[p.data.currentClass];
    // 각성 칸: 최고 레벨이면 [각성하기], 각성했으면 두 방향 중 고르기 (언제든 공짜로 바꾼다)
    const awakenBlock = (key: string, def: AwakenDef, maxed: boolean, ult: boolean) => {
      if (!maxed) return '';
      const cur = c.awaken?.[key];
      if (!cur) {
        const cost = awakenCost(ult);
        const ok = p.data.gold >= cost.gold && p.hasAll(cost.items);
        const items = Object.entries(cost.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ');
        return `<div class="awk"><div class="awk-head"><b>✦ 각성</b><small class="dim"><span class="${p.data.gold >= cost.gold ? '' : 'bad'}">${cost.gold.toLocaleString()} G</span> · ${items}</small><button class="primary" data-awk="${key}" ${ok ? '' : 'disabled'}>각성하기</button></div>
          <div class="awk-opts"><div class="awk-opt"><b>A · ${def.a.name}</b><small>${def.a.desc}</small></div><div class="awk-opt"><b>B · ${def.b.name}</b><small>${def.b.desc}</small></div></div></div>`;
      }
      const opt = (br: AwakenBranch, o: { name: string; desc: string }) =>
        `<button class="awk-opt ${cur === br ? 'on' : ''}" data-awkset="${key}:${br}"><b>${br} · ${o.name}${cur === br ? ' <span class="ok">사용 중</span>' : ''}</b><small>${o.desc}</small></button>`;
      return `<div class="awk done"><div class="awk-head"><b class="gold">✦ 각성함</b><small class="dim">눌러서 방향을 바꿀 수 있습니다 (무료)</small></div><div class="awk-opts">${opt('A', def.a)}${opt('B', def.b)}</div></div>`;
    };
    const rows = cls.skills
      .map((sk, i) => {
        const lv = c.skills[i] ?? 0;
        const cost = lv === 0 ? SKILL_LEARN[i] : lv < MAX_SKILL_LEVEL ? skillUpgradeCost(i, lv) : null;
        const ok = cost && c.level >= cost.level && p.data.gold >= cost.gold && p.hasAll(cost.items ?? {});
        const label = !cost ? '최대' : lv === 0 ? `배우기 ${cost.gold} G` : `강화 ${cost.gold} G`;
        const itemsTxt = cost?.items
          ? ' · ' + Object.entries(cost.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ')
          : '';
        const req = cost ? `필요 레벨 ${cost.level}${c.level < cost.level ? ' <span class="bad">(부족)</span>' : ''}${itemsTxt}` : '';
        return `<li><img class="gem ico" src="${skillIconUrl(p.data.currentClass, i)}" alt=""><div><b>${sk.name} ${lv ? `<span class="ok">Lv.${lv}</span>` : '<span class="dim">(미습득)</span>'}</b>
          <small>${sk.description} · MP ${sk.mp} · ${sk.cooldown}초</small>
          <small class="dim">${lv ? `위력 +${(lv - 1) * 15}% · 재사용 -${Math.round((Math.min(4, lv - 1) * 0.06 + Math.max(0, lv - 5) * 0.02) * 100)}% · 효과 ${['기본', '강화', '화려'][effectTier(lv)]}` : ''} ${req}</small>
          ${awakenBlock(`s${i}`, SKILL_AWAKEN[p.data.currentClass][i], lv >= MAX_SKILL_LEVEL, false)}</div>
          <button data-skill="${i}" ${ok ? '' : 'disabled'}>${label}</button></li>`;
      })
      .join('');
    const open = p.unlockedUlts();
    const ultRows = ULTIMATES[p.data.currentClass]
      .map((u, i) => {
        const got = open.includes(i);
        const lv = p.ultLevel(i);
        const cost = got ? ultUpgradeCost(lv) : null;
        const ok = cost && c.level >= cost.level && p.data.gold >= cost.gold && p.hasAll(cost.items);
        const itemsTxt = cost ? ' · ' + Object.entries(cost.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ') : '';
        const req = cost ? `필요 레벨 ${cost.level}${c.level < cost.level ? ' <span class="bad">(부족)</span>' : ''} · <span class="${p.data.gold >= cost.gold ? '' : 'bad'}">${cost.gold} G</span>${itemsTxt}` : '';
        const next = cost ? ` → Lv.${lv + 1}: 위력 ${Math.round(ultPower(lv + 1) * 100)}% · ${ultCooldown(lv + 1)}초` : '';
        return `<li class="${got ? '' : 'locked'}"><img class="gem ico" src="${skillIconUrl(p.data.currentClass, 6 + i)}" alt=""><div><b>${u.name} ${got ? `<span class="ok">Lv.${lv}</span>` : `<span class="dim">(${u.stone}-10 수호자 · Lv.${u.level})</span>`}</b>
          <small>${u.description} · 위력 ${Math.round(ultPower(lv) * 100)}% · ${ultCooldown(lv)}초${next}</small>
          <small class="dim">${req}</small>
          ${got ? awakenBlock(`u${i}`, ULT_AWAKEN[p.data.currentClass][i], lv >= MAX_ULT_LEVEL, true) : ''}</div>
          <button data-ult="${i}" ${ok ? '' : 'disabled'}>${!got ? '잠김' : cost ? '강화' : '최대'}</button></li>`;
      })
      .join('');
    const s = this.open(
      'skills',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>교관 카엘의 훈련장 <small>${cls.name} · <span class="gold">${p.data.gold.toLocaleString()} G</span></small></h2>
         ${message ? `<div class="notice">${message}</div>` : ''}
         
         <p class="hint">스킬 Lv.${MAX_SKILL_LEVEL}·궁극기 Lv.${MAX_ULT_LEVEL}이면 최고급 재료로 <b>각성</b>. 스킬마다 성격이 다른 두 갈래(A·B)가 있고, 각성한 뒤에는 여기서 언제든 무료로 바꿉니다. 효과는 Lv.4·Lv.7에서 더 화려해집니다.</p>
         <ul class="list scroll">${rows}
           <li class="sub-head"><div><b>궁극기 강화</b><small class="dim">${inlineGem('dim_shard')}차원 파편은 5단계 이상 파수꾼·수호자와 차원의 끝에서 모은 차원 가루를 차원집의 차원 응축기로 압축해 만듭니다. 레벨마다 위력 +25%, 재사용 대기 -5초 (최대 Lv.${MAX_ULT_LEVEL}).</small></div></li>
           ${ultRows}</ul>
       </div>`,
      onClose,
    );
    this.on(s, '[data-skill]', (b) => onBuy(Number(b.dataset.skill)));
    this.on(s, '[data-ult]', (b) => onUlt?.(Number(b.dataset.ult)));
    this.on(s, '[data-awk]', (b) => onAwaken?.(b.dataset.awk!, null));
    this.on(s, '[data-awkset]', (b) => {
      const [key, br] = b.dataset.awkset!.split(':');
      onAwaken?.(key, br as AwakenBranch);
    });
  }

  // ---------------- 직업의 전당 ----------------
  classHall(p: Progress, onPick: (id: ClassId) => void, onClose: () => void): void {
    const cards = CLASS_ORDER.map((id) => {
      const c = CLASSES[id];
      const unlocked = p.data.unlockedClasses.includes(id);
      const lv = p.data.classes[id].level;
      return `<button class="class-card ${unlocked ? '' : 'locked'} ${p.data.currentClass === id ? 'on' : ''}" data-cls="${id}" ${unlocked ? '' : 'disabled'} style="--c:${hex(c.look.tunic)}">
          ${heroPortraitUrl(id) ? `<img class="cls-portrait" src="${heroPortraitUrl(id)}" alt="">` : `<span class="badge-cls">${c.short}</span>`}
          <b>${c.name}</b>
          <small>${unlocked ? `Lv.${lv} · ${c.basic}` : id === 'summoner' ? '8장 「갈라진 차원」의 수문장을 쓰러뜨리면 해금' : '스토리를 진행하면 해금'}</small>
        </button>`;
    }).join('');
    const s = this.open(
      'hall',
      `<div class="panel wide">
         <button class="close">${ICONS.close}</button>
         <h2>직업의 전당</h2>
         <div class="class-grid">${cards}</div>
       </div>`,
      onClose,
    );
    this.on(s, '[data-cls]', (b) => onPick(b.dataset.cls as ClassId));
  }

  // ---------------- 공장: 발전기 ----------------
  /** 건물 레벨 표시와 업그레이드 버튼 (세라의 강화 도면이 있어야 한다) */
  private levelBlock(b: BuildingState, p: Progress): string {
    if (!UPGRADABLE.includes(b.type)) return '';
    const lv = b.level ?? 1;
    const next = lv + 1;
    const speed = b.type === 'generator' ? `전력 ${generatorPower(lv)}` : b.type === 'warehouse' ? `${warehouseSlots(lv)}칸` : `속도 ×${levelSpeed(lv).toFixed(2)} · ${TOOL_TIER_NAMES[lv - 1]} 단계 재료까지`;
    let html = `<div class="level-box"><b>Lv.${lv}</b> <small>${speed}</small>`;
    if (next > MAX_BUILDING_LEVEL) html += ' <small class="ok">최고 레벨</small>';
    else if (!p.flag(`bp_${b.type}_lv${next}`)) html += `<small class="dim">Lv.${next} 강화 도면 필요 (세라)</small>`;
    else {
      const cost = buildingUpgradeCost(b.type, next);
      const ok = p.hasAll(cost);
      html += `<small>Lv.${next} → ${b.type === 'generator' ? `전력 ${generatorPower(next)}` : b.type === 'warehouse' ? `${warehouseSlots(next)}칸` : `${TOOL_TIER_NAMES[next - 1]} 재료 가공 · 속도 ×${levelSpeed(next).toFixed(2)}`}</small>
        <small>${Object.entries(cost).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ')}</small>
        <button class="primary" data-upgrade ${ok ? '' : 'disabled'}>Lv.${next}로 업그레이드</button>`;
    }
    return html + '</div>';
  }

  /** 설치된 건물의 방향(출구)을 돌린다 */
  private bindRotate(s: HTMLElement, b: BuildingState, redraw: () => void): void {
    this.on(s, '[data-rotate]', () => {
      b.dir = ((b.dir + 1) % 4) as BuildingState['dir'];
      redraw();
    });
  }

  private bindUpgrade(s: HTMLElement, b: BuildingState, p: Progress, redraw: () => void): void {
    this.on(s, '[data-upgrade]', () => {
      const next = (b.level ?? 1) + 1;
      const cost = buildingUpgradeCost(b.type, next);
      if (!p.flag(`bp_${b.type}_lv${next}`) || !p.takeAll(cost)) return;
      b.level = next;
      redraw();
    });
  }

  // ---------------- 공장: 생산 건물 (광물 생성기 · 마력의 샘) ----------------
  producer(f: Factory, b: BuildingState, p: Progress, onChange: () => void, onClose: () => void, message?: string): void {
    const type = b.type as ProducerType;
    const lv = b.level ?? 1;
    const cap = PRODUCER_CAP[type];
    const stock = producerStock(b);
    const target = producerTarget(b);
    const st = f.status(b);
    const power = f.powerOf(b);
    const boost = f.boostOf(b);
    const perHour = (id: string) => Math.floor((3600 / producerTime(id)) * Math.max(power, 0) * boost);
    const pct = Math.floor((b.progress ?? 0) * 100);
    const outs = producerOutputs(type, PRODUCER_MAX_LEVEL[type]);
    const choice = outs
      .map((id, i) => {
        const open = i < lv;
        return `<button class="chip prod-pick ${id === target ? 'on' : ''}" data-pick="${id}" ${open ? '' : 'disabled'} style="--c:${hex(ITEMS[id].color)}">${inlineGem(id)}${ITEMS[id].name}${open ? '' : ` 🔒Lv.${i + 1}`}</button>`;
      })
      .join('');
    const inside = Object.entries(b.buffer ?? {}).filter(([, n]) => n > 0);
    const stockRows = inside.map(([id, n]) => `<span class="enc-chip">${inlineGem(id)}${ITEMS[id].name} ×${n}</span>`).join(' ');
    const maxLv = PRODUCER_MAX_LEVEL[type];
    let up = '';
    if (lv >= maxLv) up = '<small class="ok">최고 레벨</small>';
    else {
      const c = producerUpgradeCost(type, lv + 1);
      const ok = p.data.gold >= c.gold && p.hasAll(c.items);
      const nextOut = producerOutputs(type, lv + 1).slice(-1)[0];
      up = `<small>Lv.${lv + 1} → ${inlineGem(nextOut)}${ITEMS[nextOut].name}</small>
        <small><span class="${p.data.gold >= c.gold ? '' : 'bad'}">${c.gold.toLocaleString()} G</span> · ${Object.entries(c.items).map(([id, n]) => `<span class="${p.count(id) >= n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${n}</span>`).join(' · ')}</small>
        <button class="primary" data-prod-up ${ok ? '' : 'disabled'}>Lv.${lv + 1}로 업그레이드</button>`;
    }
    const stateTxt = st === 'blocked' ? '<b class="bad">가득 참</b>' : st === 'no-power' ? '<b class="bad">전력 없음</b>' : `<b class="ok">생산 중</b> ${pct}%`;
    const s = this.open(
      'factory-config',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>${BUILDINGS[type].name}</h2>
         ${message ? `<div class="notice">${message}</div>` : ''}
         <div class="scroll">
         <div class="level-box"><b>Lv.${lv}/${maxLv}</b> ${up}</div>
         <h3>생산품</h3>
         <div class="prod-row">${choice}</div>
         <p>${stateTxt} · ${inlineGem(target)}시간당 약 <b>${perHour(target)}</b>개 · 하나에 ${producerTime(target)}초</p>
         <h3>보관 <small>${stock}/${cap}</small></h3>
         <div class="prod-bar"><i style="width:${Math.min(100, (stock / cap) * 100)}%"></i></div>
         <p>${stockRows || '<span class="dim">비어 있음</span>'}</p>
         <div class="menu"><button class="primary" data-collect ${stock ? '' : 'disabled'}>공유 창고로 받기</button></div>
         </div>
       </div>`,
      onClose,
    );
    const again = (msg?: string) => {
      onChange();
      this.producer(f, b, p, onChange, onClose, msg);
    };
    this.on(s, '[data-pick]', (el) => {
      b.recipe = el.dataset.pick!;
      b.progress = 0;
      again();
    });
    this.on(s, '[data-collect]', () => {
      let n = 0;
      let left = 0;
      for (const [id, k] of Object.entries(b.buffer ?? {})) {
        const got = p.depositItem(id, k);
        n += got;
        left += k - got;
        if (k - got > 0) b.buffer![id] = k - got;
        else delete b.buffer![id];
      }
      again(n ? `<b class="ok">${n}개를 공유 창고로 옮겼습니다</b>${left ? ` <span class="bad">(창고가 가득 차서 ${left}개는 남김)</span>` : ''}` : '<span class="bad">공유 창고에 빈 칸이 없습니다</span>');
    });
    this.on(s, '[data-prod-up]', () => {
      if (lv >= maxLv) return;
      const c = producerUpgradeCost(type, lv + 1);
      if (p.data.gold < c.gold || !p.hasAll(c.items)) return;
      p.data.gold -= c.gold;
      p.takeAll(c.items);
      b.level = lv + 1;
      b.recipe = producerOutputs(type, lv + 1).slice(-1)[0];
      b.progress = 0;
      again(`<b class="ok">Lv.${lv + 1}!</b>`);
    });
  }

  generator(f: Factory, b: BuildingState, p: Progress, onChange: () => void, onClose: () => void): void {
    const net = f.networkInfo(b);
    const rows = ESSENCES.map((id) => {
      const inside = b.buffer?.[id] ?? 0;
      const have = p.count(id);
      return `<li>${itemGem(id)}<div><b>${ITEMS[id].name}</b><small>${Math.round(ESSENCE_BURN[id] / 60)}분 · 생산 속도 ×${ESSENCE_BOOST[id].toFixed(2)}</small><small>발전기 안 ${inside}개 · 창고 ${have}개</small></div>
        <button data-put="${id}" data-n="1" ${have ? '' : 'disabled'}>+1</button><button data-put="${id}" data-n="10" ${have ? '' : 'disabled'}>+10</button><button data-put="${id}" data-n="all" ${have ? '' : 'disabled'}>전부</button>
        <button data-take="${id}" ${inside ? '' : 'disabled'}>빼기</button></li>`;
    }).join('');
    const s = this.open(
      'factory-config',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>마력 발전기 <button class="tool-sm rot" data-rotate>↻ 방향 돌리기</button></h2>
         ${this.levelBlock(b, p)}
         <p>지금 타는 연료: <b>${b.fuel && b.fuel > 0 ? `${ITEMS[b.fuelId ?? 'essence_low'].name} ${Math.ceil(b.fuel)}초 분량` : '없음'}</b> · 생산 속도 <b>×${(net?.boost ?? 1).toFixed(2)}</b><br>
           전력망 공급 ${net?.supply ?? 0} / 수요 ${net?.demand ?? 0} · 연료 소모 ${net && net.supply > 0 ? `<b>${Math.round(Math.min(1, net.demand / net.supply) * 100)}%</b> 속도` : '멈춤'}</p>
         <ul class="list scroll">${rows}</ul>
       </div>`,
      onClose,
    );
    const again = () => {
      onChange();
      this.generator(f, b, p, onChange, onClose);
    };
    this.bindUpgrade(s, b, p, again);
    this.bindRotate(s, b, again);
    this.on(s, '[data-put]', (el) => {
      const id = el.dataset.put!;
      const n = el.dataset.n === 'all' ? p.count(id) : Math.min(p.count(id), Number(el.dataset.n));
      if (n > 0 && p.take(id, n)) b.buffer![id] = (b.buffer![id] ?? 0) + n;
      again();
    });
    this.on(s, '[data-take]', (el) => {
      const id = el.dataset.take!;
      const n = b.buffer![id] ?? 0;
      if (n > 0) {
        p.add(id, n);
        delete b.buffer![id];
      }
      again();
    });
  }

  // ---------------- 공장: 보관상자 ----------------
  box(b: BuildingState, p: Progress, onChange: () => void, onClose: () => void, qty = 10): void {
    const inside = Object.entries(b.buffer ?? {}).filter(([, n]) => n > 0);
    // 개수 입력: 위의 칸에 적은 수만큼 넣고 꺼낸다
    const insideRows = inside
      .map(([id, n]) => `<li>${itemGem(id)}<div><b>${ITEMS[id].name}</b><small>상자 안 ${n}개</small></div><button data-out="${id}" data-n="q">${qty}개 꺼내기</button><button data-out="${id}" data-n="all">전부</button></li>`)
      .join('');
    const eqs = b.equips ?? [];
    const eqRows = eqs
      .map((e, i) => `<li>${equipGem(e)}<div>${equipTitle(e)}<small>${equipLine(e)}</small></div><button data-eqbag="${i}">가방으로</button><button data-eqout="${i}">창고로</button></li>`)
      .join('');
    const storeRows = ITEM_LIST.filter((i) => i.kind !== 'key' && p.count(i.id) > 0)
      .map((i) => `<li>${itemGem(i.id)}<div><b>${i.name}</b><small>창고 ${p.count(i.id)}개</small></div><button data-in="${i.id}" data-n="q">${qty}개 넣기</button><button data-in="${i.id}" data-n="all">전부</button></li>`)
      .join('');
    const s = this.open(
      'factory-config',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>보관상자 <small>${boxTotal(b)} / ${BOX_CAPACITY}${(b.equips?.length ?? 0) ? ` · 장비 ${b.equips!.length}` : ''}</small> <button class="tool-sm rot" data-rotate>↻ 방향 돌리기</button></h2>
         <div class="tabs">
           <button data-mode="in" class="${b.mode === 'in' ? 'on' : ''}">투입 (앞 기계로 보내기)</button>
           <button data-mode="out" class="${b.mode === 'out' ? 'on' : ''}">출하 (완성품 받기)</button>
         </div>
         <div class="qty-row">개수 <button data-q="-10">−10</button><button data-q="-1">−1</button><input type="number" min="1" max="${BOX_CAPACITY}" value="${qty}" data-qty><button data-q="1">+1</button><button data-q="10">+10</button></div>
         <div class="scroll">
           ${eqs.length ? `<h3>장비 ${eqs.length}개 <small class="dim">레일로 들어온 제작대 장비</small> <button class="tool-sm" data-eqall>모두 창고로</button></h3><ul class="list">${eqRows}</ul>` : ''}
           <h3>상자 안</h3>
           <ul class="list">${insideRows || (eqs.length ? '<li class="empty">장비 말고는 비어 있습니다</li>' : '<li class="empty">비어 있습니다</li>')}</ul>
           <h3>창고에서 넣기</h3>
           <ul class="list">${storeRows || '<li class="empty">창고가 비어 있습니다</li>'}</ul>
         </div>
       </div>`,
      onClose,
    );
    const readQty = () => Math.max(1, Math.min(BOX_CAPACITY, Math.floor(Number(s.querySelector<HTMLInputElement>('[data-qty]')?.value) || qty)));
    const again = (q = readQty()) => {
      onChange();
      this.box(b, p, onChange, onClose, q);
    };
    this.on(s, '[data-q]', (el) => again(Math.max(1, Math.min(BOX_CAPACITY, readQty() + Number(el.dataset.q)))));
    s.querySelector<HTMLInputElement>('[data-qty]')?.addEventListener('change', () => again());
    this.bindRotate(s, b, again);
    this.on(s, '[data-mode]', (el) => {
      b.mode = el.dataset.mode as 'in' | 'out';
      again();
    });
    this.on(s, '[data-out]', (el) => {
      const id = el.dataset.out!;
      const have = b.buffer![id] ?? 0;
      const n = el.dataset.n === 'all' ? have : Math.min(have, readQty());
      if (n > 0) {
        b.buffer![id] -= n;
        if (b.buffer![id] <= 0) delete b.buffer![id];
        p.add(id, n);
      }
      again();
    });
    this.on(s, '[data-eqout]', (el) => {
      const e = eqs[Number(el.dataset.eqout)];
      if (!e) return;
      if (!p.storageHasSlot) return this.box(b, p, onChange, onClose, readQty());
      b.equips = eqs.filter((x) => x !== e);
      p.data.equips.push(e);
      again();
    });
    this.on(s, '[data-eqbag]', (el) => {
      const e = eqs[Number(el.dataset.eqbag)];
      if (!e || !p.invBag.addEquip(e)) return;
      b.equips = eqs.filter((x) => x !== e);
      again();
    });
    this.on(s, '[data-eqall]', () => {
      const left: Equip[] = [];
      for (const e of eqs) {
        if (p.storageHasSlot) p.data.equips.push(e);
        else left.push(e);
      }
      b.equips = left;
      again();
    });
    this.on(s, '[data-in]', (el) => {
      const id = el.dataset.in!;
      const room = BOX_CAPACITY - boxTotal(b);
      const n = Math.min(room, el.dataset.n === 'all' ? p.count(id) : Math.min(p.count(id), readQty()));
      if (n > 0 && p.take(id, n)) b.buffer![id] = (b.buffer![id] ?? 0) + n;
      again();
    });
  }

  // ---------------- 공장: 기계 ----------------
  // ---------------- 제작대: 판 · 조립 · 채집 도구 · 장비 제작, 레벨업 ----------------
  /** 제작대 세트 탭에서 고른 직업·부위 */
  private setPick: { cls: ClassId; slot: EquipSlot } | null = null;

  workbench(f: Factory, b: BuildingState, p: Progress, onChange: () => void, onClose: () => void, tab: 'plates' | 'assemble' | 'tools' | 'equip' | 'sets' | 'level' = 'plates', message?: string): void {
    const lv = b.level ?? 1;
    const speed = levelSpeed(lv);
    const busy = !!b.job;
    const verb = busy ? '추가' : '제작';
    const fmtTime = (sec: number) => {
      const t = Math.ceil(sec / speed);
      return t >= 60 ? `${Math.floor(t / 60)}분${t % 60 ? ` ${t % 60}초` : ''}` : `${t}초`;
    };
    const costHtml = (c: CraftCost, n = 1) =>
      [
        ...Object.entries(c.items).map(([id, k]) => `<span class="${p.count(id) >= k * n ? '' : 'bad'}">${inlineGem(id)}${ITEMS[id].name} ${p.count(id)}/${k * n}</span>`),
        ...(c.gold ? [`<span class="${p.data.gold >= c.gold * n ? '' : 'bad'}">${c.gold * n} G</span>`] : []),
        ...(c.time ? [`<span class="dim">${SPK('hourglass', '⏱')} ${fmtTime(c.time * n)}</span>`] : []),
      ].join(' · ');
    const afford = (c: CraftCost, n = 1) => p.data.gold >= c.gold * n && Object.entries(c.items).every(([id, k]) => p.count(id) >= k * n);
    const queueFull = (b.queue?.length ?? 0) >= WORKBENCH_QUEUE_MAX;
    const can = (c: CraftCost) => afford(c) && !queueFull;
    const btn = (attr: string, c: CraftCost, label = verb) => `<button ${attr} ${can(c) ? '' : 'disabled'}>${label}</button>`;
    /** 가진 재료·골드로 만들 수 있는 최대 개수 */
    const maxCount = (c: CraftCost) => Math.min(99, ...Object.entries(c.items).map(([id, k]) => Math.floor(p.count(id) / k)), c.gold ? Math.floor(p.data.gold / c.gold) : 99);
    let body = '';
    if (tab === 'plates') {
      const rows = Array.from({ length: lv }, (_, i) => i + 1)
        .map((t) => {
          const c = plateCraftCost(t);
          const id = TIER_PLATE[t - 1];
          const m = manaPlateCraftCost(t);
          const mid = MANA_PLATE_OF(t);
          return `<li>${itemGem(id)}<div><b>${ITEMS[id].name} <small class="dim">보유 ${p.count(id)}</small></b><small>${TOOL_TIER_NAMES[t - 1]} 장비·도구 +1~+5 강화</small><small>${costHtml(c)}</small></div>${btn(`data-item="${id}:${t}:plate"`, c)}</li>
            <li>${itemGem(mid)}<div><b>${ITEMS[mid].name} <small class="dim">보유 ${p.count(mid)}</small></b><small>${TOOL_TIER_NAMES[t - 1]} 장비·도구 +6~+10 강화</small><small>${costHtml(m)}</small></div>${btn(`data-item="${mid}:${t}:mplate"`, m)}</li>`;
        })
        .join('');
      body = `<ul class="list scroll">${rows}</ul>`;
    } else if (tab === 'assemble') {
      const rows = recipesFor('workbench')
        .map((r) => {
          const c: CraftCost = { items: r.inputs, gold: 0, time: r.time };
          const locked = r.tier > lv;
          return `<li class="${locked ? 'locked' : ''}">${itemGem(r.output)}<div><b>${ITEMS[r.output].name}${r.count > 1 ? ` ×${r.count}` : ''} <small class="dim">보유 ${p.count(r.output)}</small>${locked ? ` <small class="dim">(Lv.${r.tier} 필요)</small>` : ''}</b><small>${ITEMS[r.output].description}</small><small>${costHtml(c)}</small></div>${locked ? '' : btn(`data-item="${r.output}:${r.tier}:recipe"`, c)}</li>`;
        })
        .join('');
      body = `<ul class="list scroll">${rows}</ul>`;
    } else if (tab === 'tools') {
      body = (['pickaxe', 'axe'] as ToolKind[])
        .flatMap((k) => {
          const cur = p.data.tools[k];
          const owned = p.flag(k === 'axe' ? 'tool_axe' : 'tool_pickaxe') > 0;
          return Array.from({ length: lv }, (_, i) => i + 1)
            .filter((t) => !owned || t > cur.tier)
            .map((t) => {
              const c = toolCraftCost(t);
              return `<li>${toolGem(k, { tier: t, plus: 0, dur: 1 })}<div><b>${TOOL_TIER_NAMES[t - 1]} ${TOOL_KIND_NAMES[k]}</b><small>${TOOL_TIER_NAMES[t - 1]}${t < 7 ? `·${TOOL_TIER_NAMES[t]}` : ''} 자원까지 채집 · 내구도 ${toolMaxDur({ tier: t, plus: 0, dur: 0 })}</small><small>${costHtml(c)}</small></div>${btn(`data-tool="${k}:${t}"`, c)}</li>`;
            });
        })
        .join('');
      body = `<p class="hint">지금: ${toolName('pickaxe', p.data.tools.pickaxe)} · ${toolName('axe', p.data.tools.axe)}</p><ul class="list scroll">${body || '<li class="empty">만들 수 있는 더 좋은 도구가 없습니다. 제작대 레벨을 올리세요.</li>'}</ul>`;
    } else if (tab === 'equip') {
      const rows: string[] = [];
      for (let t = lv; t >= 1; t--)
        for (const slot of EQUIP_SLOTS) {
          const e: Equip = { uid: '', slot, cls: slot === 'weapon' ? p.data.currentClass : undefined, tier: t, grade: 0, plus: 0 };
          const c = equipCraftCost(slot, t);
          const mc = equipManaCraftCost(slot, t);
          rows.push(`<li>${equipGem(e)}<div><b>${equipName(e)}</b><small>${equipLine(e)}</small><small>일반: ${costHtml(c)}</small><small class="mana-line">${SPK('sparkle', '✨')} 마력 제작 (고급 이상): ${costHtml(mc)}</small></div>${btn(`data-eqc="${slot}:${t}"`, c)}<button class="mana-btn" data-eqm="${slot}:${t}" ${can(mc) ? '' : 'disabled'}>${SPK('sparkle', '✨')} 마력</button></li>`);
        }
      body = `<p class="hint">제작대 앞쪽(→ 방향)에 레일이나 <b>출하</b> 보관상자를 이어 두면 완성된 장비가 레일을 타고 상자로 갑니다. 이어져 있지 않으면 공유 창고로 들어갑니다.</p><ul class="list scroll">${rows.join('')}</ul>`;
    } else if (tab === 'sets') {
      // 세트 장비: 설계도 + 재료 → 고른 직업·부위의 세트 장비 (그 직업의 세 세트 중 무작위)
      const pk = (this.setPick ??= { cls: p.data.currentClass, slot: 'helmet' });
      if (!p.data.unlockedClasses.includes(pk.cls)) pk.cls = p.data.currentClass;
      const c = setCraftCost(pk.slot);
      const ok = p.data.gold >= c.gold && p.hasAll(c.items) && p.storageHasSlot;
      const all = [...Object.values(p.data.classes).flatMap((x) => Object.values(x.equipment)), ...p.data.equips, ...[p.invBag, p.dimBagObj].flatMap((x) => x.equips())].filter((e): e is Equip => !!e?.set);
      const have = (id: SetId, sl: EquipSlot) => all.some((e) => e.set === id && e.slot === sl);
      const sets = setsOf(pk.cls)
        .map((st) => {
          const owned = EQUIP_SLOTS.filter((sl) => have(st.id, sl));
          return `<li><span class="gem" style="--c:${hex(st.color)}"></span><div><b style="color:${hex(st.color)}">${SET_TYPE_NAMES[st.type]} 「${st.name}」</b> <small class="dim">모은 부위 ${owned.length}/${SET_PIECES}${owned.length ? ` (${owned.map((sl) => slotName(sl, pk.cls)).join('·')})` : ''}</small>${st.tiers.map((t) => `<small class="${owned.length >= t.n ? 'ok' : ''}">${t.n}세트: ${t.lines.map(specialText).join(', ')}</small>`).join('')}</div></li>`;
        })
        .join('');
      body = `<div class="scroll">
        <p class="hint">???에게서 받은 <b>세트 설계도</b>로 세트 장비를 만듭니다. 직업과 부위를 고르면 그 직업의 <b>공격형·방어형·균형형</b> 중 하나가 무작위로 나옵니다. 한 부위는 최종 장비보다 약하지만(능력치 ×0.9) 2·4·7부위를 모을수록 강해집니다. 전설 85% · 차원 15%, 강화·각인·특수 옵션은 보통 장비와 같습니다.</p>
        <div class="chips">${p.data.unlockedClasses.map((id) => `<button class="chip ${pk.cls === id ? 'on' : ''}" data-scls="${id}">${CLASSES[id].name}</button>`).join('')}</div>
        <div class="chips">${EQUIP_SLOTS.map((sl) => `<button class="chip ${pk.slot === sl ? 'on' : ''}" data-sslot="${sl}">${slotName(sl, pk.cls)}</button>`).join('')}</div>
        <p><small>${costHtml({ items: c.items, gold: c.gold, time: 0 })}</small></p>
        <div class="menu"><button class="primary" data-scraft ${ok ? '' : 'disabled'}>${CLASSES[pk.cls].name} 세트 ${slotName(pk.slot, pk.cls)} 만들기 (세트 무작위)</button></div>
        <ul class="list">${sets}</ul>
      </div>`;
    } else {
      const c = workbenchUpgradeCost(lv);
      body = c
        ? `<p>제작대 Lv.${lv} → <b>Lv.${lv + 1}</b></p><p class="hint">${TOOL_TIER_NAMES[lv]} 단계 판·도구·장비를 만들 수 있게 되고, 제작 속도가 ×${speed.toFixed(2)} → ×${levelSpeed(lv + 1).toFixed(2)}가 됩니다.</p>
          <p>${costHtml(c)}</p><div class="menu"><button class="primary" data-up ${afford(c) ? '' : 'disabled'}>레벨 올리기</button></div>`
        : '<p class="ok">최고 레벨입니다.</p>';
    }
    const job = b.job;
    const outN = b.out?.length ?? 0;
    const statusText = () => {
      const j = b.job;
      if (!j) return '';
      if ((b.out?.length ?? 0) >= WORKBENCH_OUT_MAX) return '<span class="bad">출구가 가득 차서 멈춤 — 완성품을 받거나 앞쪽에 레일·출하 상자를 두세요</span>';
      if (f.powerOf(b) > 0) return `<span class="ok">가동 중 · 한 개에 ${fmtTime(j.time)}</span>`;
      return `<span class="bad">${f.connected(b) ? '전력 부족 — 발전기에 마력 정수를 넣으세요' : '전력 없음 — 마력선으로 발전기와 이으세요'}</span>`;
    };
    const queue = b.queue ?? [];
    const queueHtml = queue.length
      ? `<ul class="wb-queue">${queue.map((j, i) => `<li>${workJobIcon(j)}<span>${workJobName(j)} ×${j.left}</span><button class="tool-sm" data-unq="${i}">✕</button></li>`).join('')}</ul>`
      : '';
    const jobHtml = job
      ? `<div class="wb-job">${workJobIcon(job)}<div class="wb-main"><div><b>${workJobName(job)}</b> 제작 중${job.left > 1 ? ` · 남은 ${job.left}개` : ''} <b data-pct>${Math.floor((b.progress ?? 0) * 100)}%</b></div><span class="bar"><i data-bar style="width:${Math.round((b.progress ?? 0) * 100)}%"></i></span><small data-status>${statusText()}</small></div><button class="tool-sm" data-cancel>취소</button></div>${queue.length ? `<div class="wb-qhead">예약 ${queue.length}/${WORKBENCH_QUEUE_MAX} <small class="dim">— 지금 작업이 끝나면 차례로 만듭니다</small></div>${queueHtml}` : `<p class="hint wb-tip">제작 중에도 아래에서 <b>추가</b>를 누르면 예약됩니다 (같은 것을 누르면 개수만 늘어남)</p>`}`
      : `<div class="notice">대기 중 — 아래에서 만들 것을 고르면 전력을 쓰며 제작이 시작됩니다${f.connected(b) ? '' : ' <span class="bad">(마력선에 연결되어 있지 않음)</span>'}</div>`;
    const outHtml = outN ? `<div class="notice">완성품 ${outN}개가 제작대에 쌓여 있습니다 (앞쪽 → 방향으로 레일을 이으면 자동으로 나갑니다) <button class="tool-sm" data-collect>창고로 받기</button></div>` : '';
    const s = this.open(
      'workbench',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>제작대 Lv.${lv} <small class="gold">${p.data.gold.toLocaleString()} G</small> <button class="tool-sm rot" data-rotate>↻ 방향 돌리기</button></h2>
         <div class="wb-split">
           <div class="wb-left">
             ${jobHtml}${outHtml}
             ${message ? `<div class="notice">${message}</div>` : ''}
           </div>
           <div class="wb-right">
             <div class="tabs wb-tabs">
               <button data-tab="plates" class="${tab === 'plates' ? 'on' : ''}">판 합성</button>
               <button data-tab="assemble" class="${tab === 'assemble' ? 'on' : ''}">조립</button>
               <button data-tab="tools" class="${tab === 'tools' ? 'on' : ''}">채집 도구</button>
               <button data-tab="equip" class="${tab === 'equip' ? 'on' : ''}">장비</button>
               ${p.flag('endgame') ? `<button data-tab="sets" class="${tab === 'sets' ? 'on' : ''}">◈ 세트</button>` : ''}
               <button data-tab="level" class="${tab === 'level' ? 'on' : ''}">레벨업</button>
             </div>
             <div class="wb-body ${tab === 'sets' || tab === 'level' ? '' : 'wb-grid'}">${body}</div>
           </div>
         </div>
       </div>`,
      onClose,
    );
    const again = (t = tab, msg?: string) => this.workbench(f, b, p, onChange, onClose, t, msg);
    this.bindRotate(s, b, () => again());
    // 열려 있는 동안 진행도를 갱신하고, 작업이 바뀌면 다시 그린다
    const key = () => `${b.job ? `${b.job.id}:${b.job.left}` : '-'}:${b.out?.length ?? 0}:${(b.queue ?? []).map((j) => `${j.id}${j.left}`).join(',')}`;
    const seen = key();
    const timer = window.setInterval(() => {
      if (!s.isConnected || !s.querySelector('.panel')) return window.clearInterval(timer);
      const now = key();
      // 개수 입력 창이 열려 있으면 닫힐 때까지 다시 그리지 않는다
      if (now !== seen && !s.querySelector('.qty-pop')) {
        window.clearInterval(timer);
        again(tab);
        return;
      }
      const pct = Math.floor((b.progress ?? 0) * 100);
      const bar = s.querySelector<HTMLElement>('[data-bar]');
      const txt = s.querySelector<HTMLElement>('[data-pct]');
      if (bar) bar.style.width = `${pct}%`;
      if (txt) txt.textContent = `${pct}%`;
      const st = s.querySelector<HTMLElement>('[data-status]');
      if (st) {
        const html = statusText();
        if (st.innerHTML !== html) st.innerHTML = html;
      }
    }, 300);
    const start = (c: CraftCost, n: number, make: Omit<WorkJob, 'left' | 'time' | 'cost'>) => {
      if (n < 1 || !afford(c, n)) return false;
      const job: WorkJob = { ...make, left: n, time: c.time, cost: { items: c.items, gold: c.gold } };
      if (!canEnqueue(b, job)) return false;
      p.takeAll(Object.fromEntries(Object.entries(c.items).map(([id, k]) => [id, k * n])));
      p.data.gold -= c.gold * n;
      enqueueJob(b, job);
      onChange();
      return true;
    };
    /** 개수를 고르고 제작(또는 예약)한다 */
    const pick = (title: string, c: CraftCost, make: Omit<WorkJob, 'left' | 'time' | 'cost'>, maxN = 99) => {
      const max = Math.min(maxN, maxCount(c));
      if (max < 1) return;
      const wasBusy = !!b.job;
      this.qtyPicker(s, {
        title,
        unit: 0,
        max,
        verb: wasBusy ? '예약 추가' : '제작 시작',
        summary: (n) => costHtml(c, n),
        onOk: (n) => {
          if (start(c, n, make)) again(tab, `<b class="ok">${title} ×${n} ${wasBusy ? '예약 추가!' : '제작 시작!'}</b>`);
        },
      });
    };
    this.on(s, '[data-tab]', (el) => again(el.dataset.tab as typeof tab));
    this.on(s, '[data-scls]', (el) => {
      this.setPick = { slot: this.setPick?.slot ?? 'helmet', cls: el.dataset.scls as ClassId };
      again('sets');
    });
    this.on(s, '[data-sslot]', (el) => {
      this.setPick = { cls: this.setPick?.cls ?? p.data.currentClass, slot: el.dataset.sslot as EquipSlot };
      again('sets');
    });
    this.on(s, '[data-scraft]', () => {
      const pk = this.setPick;
      if (!pk) return;
      const c = setCraftCost(pk.slot);
      if (p.data.gold < c.gold || !p.hasAll(c.items)) return;
      if (!p.storageHasSlot) return again('sets', '<b class="bad">창고에 빈 칸이 없습니다</b>');
      p.data.gold -= c.gold;
      p.takeAll(c.items);
      const set = rollClassSet(pk.cls, Math.random());
      const e = withSpecials({ uid: newUid(), slot: pk.slot, cls: pk.slot === 'weapon' ? pk.cls : undefined, tier: 7, grade: rollSetGrade(Math.random()), plus: 0, set });
      p.data.equips.push(e);
      p.achAdd('sets');
      onChange();
      const st = SETS[set];
      again('sets', `<b class="ok">완성! <span style="color:${hex(GRADES[e.grade].color)}">[${GRADES[e.grade].name}]</span> <span style="color:${hex(st.color)}">${esc(equipName(e))}</span> (${SET_TYPE_NAMES[st.type]}) — 창고에 넣었습니다</b>`);
    });
    this.on(s, '[data-item]', (el) => {
      const [id, t, kind] = el.dataset.item!.split(':');
      const tier = Number(t);
      const r = kind === 'recipe' ? recipesFor('workbench').find((x) => x.output === id)! : null;
      const c = kind === 'plate' ? plateCraftCost(tier) : kind === 'mplate' ? manaPlateCraftCost(tier) : { items: r!.inputs, gold: 0, time: r!.time };
      pick(ITEMS[id].name, c, { kind: 'item', id, tier, count: r?.count ?? 1 });
    });
    this.on(s, '[data-tool]', (el) => {
      const [k, t] = el.dataset.tool!.split(':') as [ToolKind, string];
      // 도구는 만들면 지금 도구와 바뀌므로 한 번에 하나만
      pick(`${TOOL_TIER_NAMES[Number(t) - 1]} ${TOOL_KIND_NAMES[k]}`, toolCraftCost(Number(t)), { kind: 'tool', id: k, tier: Number(t), count: 1 }, 1);
    });
    const equipStart = (slot: EquipSlot, t: number, mana: boolean) => {
      const c = mana ? equipManaCraftCost(slot, t) : equipCraftCost(slot, t);
      const e: Equip = { uid: '', slot, cls: slot === 'weapon' ? p.data.currentClass : undefined, tier: t, grade: 0, plus: 0 };
      pick(`${mana ? '[마력] ' : ''}${equipName(e)}`, c, { kind: 'equip', id: slot, tier: t, mana, cls: e.cls, count: 1 });
    };
    this.on(s, '[data-eqc]', (el) => {
      const [slot, t] = el.dataset.eqc!.split(':') as [EquipSlot, string];
      equipStart(slot, Number(t), false);
    });
    this.on(s, '[data-eqm]', (el) => {
      const [slot, t] = el.dataset.eqm!.split(':') as [EquipSlot, string];
      equipStart(slot, Number(t), true);
    });
    const refund = (j: WorkJob) => {
      for (const [id, k] of Object.entries(j.cost.items)) p.add(id, k * j.left);
      p.data.gold += j.cost.gold * j.left;
    };
    this.on(s, '[data-unq]', (el) => {
      const i = Number(el.dataset.unq);
      const j = b.queue?.[i];
      if (!j) return;
      refund(j);
      b.queue!.splice(i, 1);
      onChange();
      again(tab, `예약한 ${workJobName(j)} ×${j.left}을(를) 취소하고 재료를 돌려받았습니다`);
    });
    this.on(s, '[data-cancel]', () => {
      const j = b.job;
      if (!j) return;
      refund(j);
      b.job = b.queue?.shift() ?? null;
      b.progress = 0;
      onChange();
      again(tab, `${workJobName(j)} 제작을 취소하고 재료 ${j.left}개 분량을 돌려받았습니다`);
    });
    this.on(s, '[data-collect]', () => {
      const n = b.out?.length ?? 0;
      for (const id of b.out ?? []) {
        if (isEquipToken(id)) p.data.equips.push(equipFromToken(id));
        else p.add(id, 1);
      }
      b.out = [];
      onChange();
      again(tab, `완성품 ${n}개를 창고로 옮겼습니다`);
    });
    this.on(s, '[data-up]', () => {
      const c = workbenchUpgradeCost(lv);
      if (!c || !afford(c)) return;
      p.takeAll(c.items);
      p.data.gold -= c.gold;
      b.level = lv + 1;
      onChange();
      again('level', `<b class="ok">제작대 Lv.${lv + 1}!</b>`);
    });
  }

  machine(f: Factory, b: BuildingState, p: Progress, onChange: () => void, onClose: () => void): void {
    const def = BUILDINGS[b.type];
    let body = `<p class="hint">${def.description}</p>`;
    if (b.crafting) {
      const r = RECIPE_BY_ID[b.crafting];
      body += `<div class="notice">생산 중: ${inlineGem(r.output)}<b>${ITEMS[r.output].name}</b> ×${r.count} · ${Math.floor((b.progress ?? 0) * 100)}% (총 ${r.time}초)</div>`;
    }
    if (MACHINE_TYPES.has(b.type)) {
      const list = RECIPES.filter((r) => r.machine === b.type)
        .map((r) => `<li class="${r.tier > (b.level ?? 1) ? 'locked' : ''}">${itemGem(r.output)}<div><b>${ITEMS[r.output].name}${r.count > 1 ? ` ×${r.count}` : ''}${r.tier > (b.level ?? 1) ? ` <small class="dim">(Lv.${r.tier} 필요)</small>` : ''}</b><small>${Object.entries(r.inputs).map(([id, n]) => `${ITEMS[id].name}×${n}`).join(' + ')} · ${r.time}초</small></div></li>`)
        .join('');
      body += `<h3>레시피</h3><ul class="list">${list}</ul>`;
    }
    const net = f.networkInfo(b);
    const statusText = { working: '가동 중', 'no-power': '전력 부족 (발전기 연료 확인)', idle: '재료 대기', blocked: '출구 막힘', 'no-recipe': '설계 선택 필요' }[f.status(b)];
    body += `<p class="hint">${f.connected(b) ? `전력망: 공급 ${net?.supply ?? 0} / 수요 ${net?.demand ?? 0}${net && net.boost > 1 ? ` · 연료 효과 생산 속도 ×${net.boost.toFixed(2)}` : ""}` : '<span class="bad">마력선에 연결되어 있지 않습니다</span>'} · 상태: <b>${statusText}</b></p>`;
    const buf = Object.entries(b.buffer ?? {}).filter(([, n]) => n > 0);
    if (buf.length) body += `<p class="hint">대기 중인 재료: ${buf.map(([id, n]) => `${ITEMS[id].name} ${n}`).join(', ')}</p>`;
    const miss = f.missingInputs(b);
    if (miss)
      body = `<div class="notice warn-box">${SPK('warning', '⚠')} <b>${ITEMS[miss.recipe.output].name}</b>을(를) 만들려면 ${Object.entries(miss.missing)
        .map(([id, n]) => `${inlineGem(id)}<b>${ITEMS[id].name} ${n}개</b>`)
        .join(', ')}가 더 필요합니다. 투입 상자에 함께 넣어 주세요.</div>` + body;
    const s = this.open(
      'factory-config',
      `<div class="panel wide tall">
         <button class="close">${ICONS.close}</button>
         <h2>${def.name} <button class="tool-sm rot" data-rotate>↻ 방향 돌리기</button></h2>
         ${this.levelBlock(b, p)}
         <div class="scroll">${body}</div>
       </div>`,
      onClose,
    );
    this.bindUpgrade(s, b, p, () => {
      onChange();
      this.machine(f, b, p, onChange, onClose);
    });
    this.bindRotate(s, b, () => {
      onChange();
      this.machine(f, b, p, onChange, onClose);
    });
    this.on(s, '[data-recipe]', (el) => {
      for (const [id, n] of Object.entries(b.buffer ?? {})) if (n > 0) p.add(id, n);
      b.buffer = {};
      b.recipe = el.dataset.recipe!;
      onChange();
      this.machine(f, b, p, onChange, onClose);
    });
  }

  factoryExpand(p: Progress, onExpand: () => void, onClose: () => void): void {
    const next = FACTORY_SIZES[p.data.factory.sizeLevel + 1];
    let body = '<p>이미 가장 넓은 차원집입니다.</p>';
    if (next?.cost) {
      const cost = next.cost;
      const ok = p.data.gold >= cost.gold && p.hasAll(cost.items);
      body = `<p>공장 넓이 ${p.factorySize}×${p.factorySize} → <b>${next.size}×${next.size}</b></p>
        <ul class="list">${Object.entries(cost.items).map(([id, n]) => `<li>${itemGem(id)}<div><b>${ITEMS[id].name}</b></div><b class="num ${p.count(id) >= n ? '' : 'bad'}">${p.count(id)} / ${n}</b></li>`).join('')}
        <li>${itemGem('gold')}<div><b>골드</b></div><b class="num ${p.data.gold >= cost.gold ? '' : 'bad'}">${p.data.gold} / ${cost.gold}</b></li></ul>
        <div class="menu"><button class="primary" data-x ${ok ? '' : 'disabled'}>확장하기</button></div>`;
    }
    const s = this.open('factory-config', `<div class="panel"><button class="close">${ICONS.close}</button><h2>차원집 확장</h2>${body}</div>`, onClose);
    this.on(s, '[data-x]', onExpand);
  }

  // ---------------- 알림 ----------------
  notice(title: string, html: string, onOk: () => void, button = '확인'): void {
    const s = this.open('notice-screen', `<div class="panel"><h2>${title}</h2>${html}<div class="menu"><button class="primary" data-ok>${button}</button></div></div>`, onOk);
    this.on(s, '[data-ok]', () => this.close());
  }

  offlineReward(seconds: number, produced: Map<string, number>, onOk: () => void): void {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const rows = [...produced].filter(([, n]) => n > 0).map(([id, n]) => `<li>${itemGem(id)}${ITEMS[id].name}<b>+${n}</b></li>`).join('');
    this.notice(
      '오프라인 보상',
      `<p class="hint">자리를 비운 ${h ? `${h}시간 ` : ''}${m}분 동안 차원집 공장이 돌아갔습니다. 출하 보관상자를 확인해 보세요.</p><ul class="loot">${rows || '<li class="empty">새로 만들어진 것이 없습니다</li>'}</ul>`,
      onOk,
    );
  }
}

const NPC_NAMES: Record<string, string> = { trainer: '교관 카엘', chief: '촌장 에단', guide: '안내인 리아', smith: '대장장이 고른', engineer: '마공학자 세라', merchant: '상인 무트', stranger: '???', researcher: '몬스터 연구자 노아' };
export const npcName = (id: string) => NPC_NAMES[id] ?? id;
