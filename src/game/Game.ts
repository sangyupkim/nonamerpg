import { bustUrl, itemIconUrl, skillIconUrl } from '../ui/itemIcons';
import { decodeSave, encodeSave } from './saveCode';
import { makeTestSave } from './testSave';
import { gearLook } from '../models/items';
import { BOSS_RESPAWN_MS, BOSS_TIME_LIMIT, FARM_COOLDOWN_MS, FARM_NAMES, goldScale, lowStageExpMult, playerDefK, vaultPileGold } from '../data/monsters';
import { BOSS_SPECIES, DEBUFF_INFO, pickSpecies, type DebuffId, type DebuffSpec } from '../data/species';
import { newTool, TOOL_KIND_NAMES, TOOL_TIER_NAMES, toolBonusChance, toolName, toolSpeed, toolWear, type ToolKind } from '../data/tools';
import { AdditiveBlending, BoxGeometry, Mesh, MeshBasicMaterial, MeshLambertMaterial, OrthographicCamera, PCFShadowMap, Plane, Raycaster, Vector2, Vector3, WebGLRenderer } from 'three';
import { CAMERA_OFFSET, GAME_VERSION, PLAYER, SCREEN_RIGHT, SCREEN_UP, TILE, VIEW_HEIGHT } from '../config';
import { Audio } from '../core/audio';
import { Input } from '../core/input';
import { Rng, randomSeed } from '../core/rng';
import { CLASSES, CLASS_ORDER, expToNext, MAX_LEVEL, MAX_SKILL_LEVEL, MAX_ULT_LEVEL, SKILL_LEARN, skillUpgradeCost, ULTIMATES, type ClassId } from '../data/classes';
import { ultUpgradeCost } from '../data/ultUpgrade';
import { durability, equipName, GRADE, GRADES, newUid, rollEquip, rollSeries, withSpecials, type Equip } from '../data/equipment';
import { SET_TOKEN } from '../data/sets';
import { rollManaGrade } from '../data/crafting';
import { BUILDINGS, FACTORY_SIZES, OFFLINE_CAP_HOURS, PRODUCER_LIMIT, PRODUCER_TYPES, PRODUCER_UNLOCK, type BuildingType, type ProducerType, upgradeBlueprintCost } from '../data/factory';
import { essenceForTier, ITEMS, TIER_PLATE, ORE_TIERS, TIER_MANA_PLATE } from '../data/items';
import { QUEST_BY_ID, type NpcRef, type QuestDef } from '../data/quests';
import { SCRIPTS, type Step } from '../data/story';
import { moveWithCollision } from '../dungeon/collision';
import { generateDungeon, generateHordeField, generateTowerFloor, type GenOptions, isFloor, type FarmKind } from '../dungeon/generator';
import { Factory, MACHINE_TYPES, RECIPE_BY_ID, type BuildingState, type Dir } from '../factory/sim';
import { BuildBar } from '../ui/buildbar';
import { Dialogue } from '../ui/dialogue';
import { Hud } from '../ui/hud';
import { Minimap, type MapMarker } from '../ui/minimap';
import { formatWait, hex, Screens, workJobEquip, workJobIconUrl } from '../ui/screens';
import { Bag } from './Bag';
import { Combat } from './Combat';
import type { Monster } from './Monster';
import type { SpecialTotals } from '../data/special';
import { AWAKEN_HOLD, awakenCost, awakenHolds, SKILL_AWAKEN, STORM_RESUME, ULT_AWAKEN } from '../data/awaken';
import { rememberNickname, submitTrial } from '../core/leaderboard';
import { ACHIEVEMENTS, ACH_BY_ID, newAch, type AchCtx } from '../data/achievements';
import { MARK } from '../data/marks';
import { saveControls } from '../core/controls';
import { Player } from './Player';
import { PACT_AWAKEN_KILLS, DIM_BAG_MAX, deleteSave, hasSave, loadSave, newSave, Progress, useTestSlot, stageIndex, stageOf, type SaveData, type Stats, type RunCheckpoint } from './Progress';
import { objectiveNeed, objectiveProgress, Quests } from './Quests';
import { bonusText, FOOD_MINUTES, FOODS, TITLES, type BonusKey } from '../data/bonus';
import { hasStory, objective, questLines, scriptFor } from './Story';
import { todayKey } from './Quests';
import { BLESSINGS, BLESS_IDS, blessNeed, dayKey, hordeDaily, HORDE_BOSS_EVERY, HORDE_MAX_ALIVE, HORDE_MILESTONES, hordeMult, hordeRate, HURRY_TIME, newHorde, newRaid, prevDayKey, prevWeekKey, RAID_HP, RAID_TIME, raidDayMarks, raidScore, raidScoreText, raidSpec, trialDayMarks, VOWS, vowMult, type BlessId, type RaidRecord, type VowId } from '../data/endgame';
import { rankMarks } from '../data/marks';
import { CH8_LUCK, CH8_RULES, CH8_SET_DROP, CH8_STAGES, CH8_THEME, ch8Mult, type Ch8Rule } from '../data/chapter8';
import { CH8_BOSS, CH8_MIDBOSS, RAID_SPECIES, SPECIES, TIER_POOLS } from '../data/species';
import { myRank } from '../core/leaderboard';
import { END_NAMES, endLock, type EndContent, rushEntry, riftEntry, AFFIXES, riftAffixes, riftLuck, riftMult, riftReward, RIFT_NODE_MULT, RIFT_TIME, rushFights, rushFightName, rushGrade, rushReward, RUSH_DIFFS, DUST, formatClock, newTrial, rollTrialWeek, trialGrade, TRIAL_GRADES, TRIAL_HP, trialScore, trialScoreText, trialSpec, TRIAL_TIME, weekKey, type TrialRecord, towerBoss, towerDaily, towerFirstClear, towerMult, towerTheme, type EndRun } from '../data/endgame';
import { DungeonScene, type DungeonMods, type NodeInstance, type WaveSpec } from './scenes/DungeonScene';
import { HomeScene } from './scenes/HomeScene';
import type { Interactable, Level } from './scenes/Level';
import { NPCS, VillageScene, type NpcId, type VillageSpot } from './scenes/VillageScene';

type Mode = 'title' | 'play' | 'menu' | 'dialogue' | 'dead';

interface Run {
  tier: number;
  stage: number;
  bag: Bag;
  dimBag: Bag;
  gold: number;
  exp: number;
  time: number;
  stagesCleared: number;
  /** 이번 방을 클리어 처리했는지 */
  roomCleared: boolean;
  /** 던전에 들어갈 때 가방에 있던 것 (결과 화면에서 새로 얻은 것만 보여 준다) */
  start: Map<string, number>;
  startEquips: Set<string>;
  /** 물약 주머니 (좋은 것부터, 최대 POTION_POUCH개) */
  pouch: string[];
  /** 채집 특화 맵이면 종류 */
  farm?: FarmKind;
  /** 이번 방의 보스를 쓰러뜨렸는지 (꺼졌다 켜도 다시 나오지 않게) */
  bossKilled?: boolean;
  /** 엔드 콘텐츠(무한의 탑·보스 러시·심연 균열) 한 판 */
  end?: EndRun;
  /** 균열: 시간 초과를 알렸는지 */
  riftLate?: boolean;
}

const ESSENCE = essenceForTier;
const NPC_IDS = new Set<string>(NPCS.map((n) => n.id));
const MAX_STAGE = 70;
/** 무한 러쉬에 나오는 종족: 여러 단계의 사람형·언데드·공허 몬스터 (단계 색을 쓰는 짐승은 7단계 것만) */
const HORDE_POOL: [string, number][] = (() => {
  const seen = new Map<string, number>();
  for (let t = 1; t <= 7; t++) for (const [id, w] of TIER_POOLS[t]) if (!/^t\d_/.test(id) || id.startsWith('t7_')) seen.set(id, Math.max(seen.get(id) ?? 0, w));
  return [...seen].filter(([id]) => SPECIES[id]);
})();
/** 가로 시야 기준 화면비 (막대형 휴대폰 가로) */
const REF_ASPECT = 2.2;

/** 물약 (좋은 순서) → 회복 비율 */
const POTION_KINDS: [string, number][] = [
  ['potion_high', 1],
  ['potion_mid', 0.7],
  ['potion', 0.3],
];
const POTION_POUCH = 10;
/** 보물 상자가 고급 상자일 확률 */
const AMBUSH_CHANCE = 0.3;
const POTION_COOLDOWN = 8;
/** 자동 채집: 꾹 누르는 시간(초)과 시작한 자리에서 캘 반경 */
const AUTO_GATHER_HOLD = 3;
const AUTO_GATHER_RANGE = 12;

export class Game {
  private renderer: WebGLRenderer;
  private camera: OrthographicCamera;
  private camTarget = new Vector3();
  private input: Input;
  private hud: Hud;
  private screens: Screens;
  private dialogue: Dialogue;
  private buildBar: BuildBar;
  private audio = new Audio();
  private fadeEl: HTMLDivElement;

  private progress!: Progress;
  private quests!: Quests;
  private factory!: Factory;
  private level!: Level;
  private player!: Player;
  private playerMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private combat!: Combat;
  private minimap: Minimap | null = null;
  private bigMap = false;
  private run: Run | null = null;
  private mode: Mode = 'title';
  private building = false;
  private hitStopT = 0;
  private shakeT = 0;
  private lastTime = 0;
  private saveTimer = 0;
  private minimapTimer = 0;
  private factoryAcc = 0;
  private potionCd = 0;
  private deadTimer = 0;
  /** 공격 버튼을 연타해도 입력이 사라지지 않게 잠시 기억한다 */
  private attackBuffer = 0;
  private gathering: NodeInstance | null = null;
  private pendingEndgame = false;
  private afterMenu: (() => void) | null = null;
  private raycaster = new Raycaster();
  private ground = new Plane(new Vector3(0, 1, 0), 0);
  private dragCell: { x: number; y: number } | null = null;
  private ghostCell: { x: number; y: number } | null = null;
  /** 이동 도구: 옮기는 건물의 원래 칸과 지금 가리키는 칸 */
  private moveFrom: { x: number; y: number } | null = null;
  private moveTo: { x: number; y: number } | null = null;

  constructor(private container: HTMLElement) {
    // stencil: 캐릭터 실루엣을 한 번만 칠하려고 쓴다
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: true });
    // 실루엣을 바닥 높이 아래에서는 자른다 (구르기·계단에서 파랗게 물드는 것 방지)
    this.renderer.localClippingEnabled = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    // 8장 '칠흑': 화면 가장자리를 어둡게 (HUD 아래)
    const vignette = document.createElement('div');
    vignette.className = 'ch8-vignette';
    container.appendChild(vignette);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.input = new Input(this.renderer.domElement);
    const click = () => this.audio.play('click');
    this.hud = new Hud(container, this.input, () => this.audio.unlock());
    this.buildBar = new BuildBar(container, {
      onDone: () => this.setBuilding(false),
      onExpand: () => this.openExpand(),
      onChange: () => {},
      click,
    });
    this.screens = new Screens(container, click);
    this.dialogue = new Dialogue(container, {
      set: (flag, v) => this.progress.setFlag(flag, v),
      run: (cmd) => this.runCommand(cmd),
      shake: () => (this.shakeT = 0.6),
      click,
      blip: (speaker) => {
        // 이름으로 음높이를 정한다 (내레이션은 낮고 부드럽게)
        let h = 0;
        for (const c of speaker) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        this.audio.blip(speaker ? 320 + (h % 9) * 45 : 220);
      },
      displayName: (speaker) => (speaker === '나' && this.progress?.data.nickname ? this.progress.data.nickname : speaker),
      portrait: (speaker) => {
        // 8장에서 합류하는 차원 소환사 세이
        if (speaker === '세이') return bustUrl('sei', { tunic: 0x3a2a6a, tunicDark: 0x241a48, hair: 0xe8e0ff, weapon: 'orb' });
        const npc = NPCS.find((n) => n.name === speaker || n.name.endsWith(` ${speaker}`));
        return npc ? bustUrl(npc.id, npc.look) : '';
      },
    });
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'scene-fade';
    container.appendChild(this.fadeEl);

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveNow();
        if (this.mode === 'play') this.openPause();
      }
    });
    window.addEventListener('pagehide', () => this.saveNow());
    window.addEventListener('pointerdown', () => this.audio.unlock(), { capture: true });
    this.setupBuildPointer();

    // 타이틀 뒤 배경으로 쓸 던전
    this.setProgress(new Progress(newSave()));
    this.enterDungeon(1, 1, true);
    this.resize();
    this.showTitle();

    this.lastTime = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private setProgress(p: Progress): void {
    this.progress = p;
    this.hud.timersOpen = p.data.settings.timersOpen !== false;
    // 퀘스트 탭의 [다시 보기]
    this.screens.onReplay = (steps, back) => {
      this.screens.close();
      this.playSteps(steps, () => this.openMenu(back));
    };
    this.hud.objectiveOpen = p.data.settings.questsOpen !== false;
    this.hud.onObjectiveToggle = (open) => {
      p.data.settings.questsOpen = open;
      this.saveNow();
    };
    this.hud.onTimersToggle = (open) => {
      p.data.settings.timersOpen = open;
      this.saveNow();
    };
    this.timerAcc = 1;
    this.quests = new Quests(p.data.quests, {
      count: (id) => p.count(id),
      get stones() {
        return p.stoneCount;
      },
      get cleared() {
        return p.data.cleared;
      },
      flag: (f) => p.flag(f),
      get discovered() {
        return p.discovered;
      },
    });
    this.factory = new Factory(p.data.factory, p.factorySize);
    this.factory.onCraft = (item, n) => this.quests.event({ type: 'craft', item, count: n });
    // 레일로 일반 창고에 들어온 아이템은 차원집 보관함으로
    this.factory.onStore = (item) => p.addHome(item, 1) === 1;
  }

  // =============== 시작 / 저장 ===============
  private showTitle(): void {
    // 타이틀의 이어하기·새로 시작은 언제나 진짜 저장
    useTestSlot(false);
    this.mode = 'title';
    // 타이틀에서도 마을 배경음 (첫 터치 뒤에 소리가 켜진다)
    this.audio.playMusic('village');
    this.hud.setVisible(false);
    this.screens.title(
      hasSave(),
      () => this.startGame(newSave(), true),
      () => {
        const data = loadSave();
        this.startGame(data ?? newSave(), !data);
      },
      () => {
        let loaded = false;
        this.screens.loadCode(
          (code, done) => {
            void decodeSave(code).then((data) => {
              if (!data) return done('<span class="bad">코드를 읽을 수 없습니다. 전부 복사했는지 확인해 주세요.</span>');
              if (hasSave() && !confirm('지금 기기의 진행을 이 코드의 내용으로 바꿀까요?')) return done('취소했습니다');
              loaded = true;
              new Progress(data).save();
              this.startGame(data, false);
            });
          },
          () => {
            if (!loaded) this.showTitle();
          },
        );
      },
      // 테스트 캐릭터: 진짜 저장과 따로 저장된다
      () => {
        useTestSlot(true);
        const start = (data: SaveData) => {
          new Progress(data).save();
          this.startGame(data, false);
          this.hud.toast(':sparkle: 테스트 캐릭터 (진짜 저장과 따로 저장됩니다 · 타이틀로 나가면 원래 저장으로)', 4000);
        };
        const old = hasSave() ? loadSave() : null;
        if (!old) return start(makeTestSave());
        this.screens.ask(
          '테스트 캐릭터',
          '전에 쓰던 테스트 캐릭터를 이어서 할까요?<br><small>아니오: 만렙·최종 장비 테스트 캐릭터를 새로 만듭니다</small>',
          () => start(old),
          () => start(makeTestSave()),
        );
      },
      // 저장 코드 만들기: 이 기기에 저장된 진행을 코드로
      () => {
        const data = loadSave();
        if (!data) return;
        void encodeSave(data).then((code) => this.screens.saveCode(code, () => this.showTitle()));
      },
    );
  }

  private startGame(data: SaveData, isNew: boolean): void {
    requestFullscreenLandscape();
    this.audio.unlock();
    if (isNew) deleteSave();
    this.setProgress(new Progress(data));
    this.freshLoad = !isNew;
    this.audio.setEnabled(data.settings.sound);
    this.audio.setMusicVolume(data.settings.music ?? 0.7);
    this.audio.setSfxVolume(data.settings.sfx ?? 0.8);
    this.screens.close();
    const offline = isNew ? 0 : Math.min(OFFLINE_CAP_HOURS * 3600, (Date.now() - data.lastSaved) / 1000);
    this.mode = 'play';
    const cp = data.run;
    if (!isNew && cp) {
      // 던전 도중에 꺼졌다: 그 방으로 돌아간다
      this.resumeFrom = cp;
      this.enterDungeon(cp.tier, cp.stage, false, cp.farm);
      if (cp.roomCleared && this.level instanceof DungeonScene) {
        // 이미 정리한 방이면 몬스터 없이 워프 게이트가 열린 상태로
        for (const m of this.level.monsters) if (m.alive) m.damage(m.hp + 1, m.x, m.z, 0);
        this.run!.roomCleared = true;
      }
      this.hud.toast(`${cp.tier}-${cp.stage} 던전으로 돌아왔습니다 (마지막 저장 지점)`, 3500);
      this.saveNow();
      this.needNickname(() => {});
      return;
    }
    this.enterVillage('start');
    if (isNew) {
      this.saveNow();
      this.askNickname(() => this.playScript('prologue', () => {
        // 프롤로그가 끝나면 리아의 첫 의뢰를 바로 받는다
        const q = QUEST_BY_ID.m1_hunt;
        this.quests.accept(q);
        this.hud.toast(`퀘스트 수락: ${q.title}`, 3000);
        this.refreshHud();
      }));
    } else if (offline > 60 && this.progress.flag('home') && data.factory.buildings.length) {
      const before = this.boxSnapshot();
      this.factory.simulate(offline);
      const after = this.boxSnapshot();
      const produced = new Map<string, number>();
      for (const [id, n] of after) if (n > (before.get(id) ?? 0)) produced.set(id, n - (before.get(id) ?? 0));
      this.saveNow();
      this.needNickname(() => this.openMenu(() => this.screens.offlineReward(offline, produced, () => this.resume())));
    } else this.needNickname(() => {});
  }

  /** 닉네임이 없는 예전 저장: 먼저 닉네임을 정하게 한다 (꼭 정해야 넘어간다) */
  private needNickname(then: () => void): void {
    if (this.progress.data.nickname) return then();
    this.askNickname(then, '업데이트로 닉네임이 생겼습니다. 순위표·의견함·머리 위 이름에 쓸 닉네임을 정해 주세요');
  }

  /** 닉네임 정하기 창 (게임은 멈춘다) */
  private askNickname(then: () => void, intro?: string): void {
    this.openMenu(() =>
      this.screens.nickname(
        this.progress.data.nickname ?? '',
        (name) => {
          this.progress.data.nickname = name;
          rememberNickname(name);
          this.saveNow();
          this.resume();
          then();
        },
        intro,
      ),
    );
  }

  /** 출하 보관상자의 내용물 합계 (오프라인 보상 계산용) */
  private boxSnapshot(): Map<string, number> {
    const m = new Map<string, number>();
    for (const b of this.factory.state.buildings) {
      if (b.type !== 'box' || b.mode !== 'out') continue;
      for (const [id, n] of Object.entries(b.buffer ?? {})) m.set(id, (m.get(id) ?? 0) + n);
    }
    return m;
  }

  private saveNow(): void {
    if (this.mode === 'title') return;
    if (this.player) this.progress.data.hp = Math.max(1, Math.round(this.player.hp));
    // 던전 안이면 체크포인트를 함께 저장한다 (꺼졌다 켜면 이 방으로 돌아온다)
    const r = this.run;
    this.progress.data.run =
      r && this.mode !== 'dead' && !r.end
        ? {
            tier: r.tier,
            stage: r.stage,
            gold: r.gold,
            exp: r.exp,
            time: r.time,
            stagesCleared: r.stagesCleared,
            roomCleared: r.roomCleared,
            start: [...r.start],
            startEquips: [...r.startEquips],
            pouch: [...r.pouch],
            farm: r.farm,
            bossKilled: r.bossKilled,
          }
        : undefined;
    this.progress.save();
  }

  // =============== 장면 전환 ===============
  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    // 가로 화면은 막대형 휴대폰(가로 약 2.2:1) 기준으로 가로 폭을 맞춘다.
    // 폴드처럼 네모에 가까운 화면은 가로는 같게 보이고 세로만 더 보인다 (확대되어 보이지 않게)
    const viewH = aspect >= REF_ASPECT ? VIEW_HEIGHT : aspect >= 1 ? (VIEW_HEIGHT * REF_ASPECT) / aspect : (VIEW_HEIGHT * 1.6) / aspect;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.left = (-viewH * aspect) / 2;
    this.camera.right = (viewH * aspect) / 2;
    this.camera.updateProjectionMatrix();
    this.hud.joystick.reset();
    if (this.building) this.fitBuildCamera();
  }

  private fade(): void {
    this.fadeEl.classList.remove('go');
    void this.fadeEl.offsetWidth;
    this.fadeEl.classList.add('go');
  }

  private loadLevel(level: Level, fogMap: boolean): void {
    if (this.level) this.level.dispose();
    // 차원집을 떠나면 치유석은 쉰다 (전력을 쓰지 않는다)
    for (const b of this.factory.state.buildings) if (b.type === 'healer') b.active = false;
    this.level = level;
    this.hud.setWave(0, 0, false, true);
    this.hud.setBossTags([]);
    // 차원집 안에서는 일반 창고의 재료도 가진 것으로 친다
    this.progress.atHome = level instanceof HomeScene;
    this.buildMode(false);
    this.gathering = null;
    this.autoGather = null;
    this.gatherHold = 0;
    this.hud.setInteractCharge(-1);
    this.makePlayer(level.playerStart.x, level.playerStart.z, level.playerStart.facing);
    this.camTarget.set(level.playerStart.x, 0, level.playerStart.z);
    level.sun.castShadow = this.progress.data.settings.shadows;
    this.hud.setMode(level.kind);
    this.hud.setBoss(null);
    this.minimap = new Minimap(level.grid, fogMap);
    this.hud.setMinimap(this.minimap.canvas);
    this.setBigMap(false);
    this.fade();
  }

  /** 장면이 바뀌어도 HP는 그대로 이어진다 (쓰러졌으면 1). fullHeal이면 가득 */
  private makePlayer(x: number, z: number, facing: number, keepHp = false, fullHeal = false): void {
    const prev = this.player;
    if (prev) prev.rig.root.parent?.remove(prev.rig.root);
    const cls = CLASSES[this.progress.data.currentClass];
    this.gearKey = JSON.stringify(gearLook(this.progress.cls.equipment, this.progress.data.tools));
    this.player = new Player(this.playerMaterial, cls, gearLook(this.progress.cls.equipment, this.progress.data.tools));
    this.player.facing = facing;
    this.player.setPosition(x, z);
    const st = this.progress.stats();
    this.player.maxHp = st.maxHp;
    this.player.maxMp = st.maxMp;
    this.player.moveBonus = this.progress.bonus('move') + 0.08 * (this.horde?.stacks.swift ?? 0);
    this.player.dodgeCdMult = this.runVow('slowdodge') ? 2 : 1;
    // 8장 차원 규칙: 무중력(회피 거리 2배) · 공허(MP 재생 없음)
    this.player.dashMult = this.ch8Has('drift') ? 2 : 1;
    this.player.noMpRegen = this.ch8Has('void');
    this.player.mpRegenBonus = this.progress.bonus('mpRegen');
    this.applyAura();
    // 게임을 막 불러왔으면 저장된 HP, 아니면 직전 장면의 HP를 이어받는다
    const carried = prev && !this.freshLoad ? prev.hp : (this.progress.data.hp ?? st.maxHp);
    this.freshLoad = false;
    this.player.hp = fullHeal ? st.maxHp : Math.min(st.maxHp, Math.max(1, carried));
    this.player.mp = keepHp && prev ? Math.min(st.maxMp, prev.mp) : st.maxMp;
    this.level.scene.add(this.player.rig.root);
    const game = this;
    this.combat?.minions.clear();
    this.combat = new Combat({
      get player() {
        return game.player;
      },
      stats: () => this.buffedStats(),
      level: () => this.level,
      dungeon: () => (this.level instanceof DungeonScene && this.run ? this.level : null),
      damageMonster: (m, mult, knock, fx, fz) => this.damageMonster(m, mult, knock, fx, fz),
      shake: (a) => (this.shakeT = Math.max(this.shakeT, a)),
      hitStop: (t) => (this.hitStopT = Math.max(this.hitStopT, t)),
      sfx: (n) => this.audio.play(n),
      // 시련: 배운 스킬은 모두 최고 레벨로 (같은 조건)
      awaken: (key) => this.progress.awakenOf(key),
      skillLevel: (i) => (this.progress.trial && (this.progress.cls.skills[i] ?? 0) > 0 ? MAX_SKILL_LEVEL : (this.progress.cls.skills[i] ?? 0)),
      bonus: (k) => this.progress.bonus(k) + (k === 'cdr' ? Math.min(0.4 - this.progress.bonus('cdr'), 0.08 * (this.horde?.stacks.focus ?? 0)) : 0),
      special: (k) => this.specialTotals()[k] ?? 0,
      pacts: () => this.progress.activePacts().map((id) => ({ species: SPECIES[id], awakened: this.progress.kills(id) >= PACT_AWAKEN_KILLS })).filter((x) => x.species),
      // 소환수 위력: 소환수 위력 보너스(계약 계열) + 특수 옵션 + 계약한 종족마다 +1% (최대 60%)
      summonPower: () => 1 + this.progress.bonus('summon') + (this.specialTotals().summonDmg ?? 0) / 100 + Math.min(0.6, this.progress.pactEligible().length * 0.01),
      autoAim: () => this.progress.data.settings.autoAim !== false,
    });
    this.hud.setClass(cls.short, hex(cls.look.tunic), cls.skills.map((s) => s.name), this.progress.data.currentClass);
    this.updatePortrait();
  }

  private enterVillage(arrival: 'portal' | 'home' | 'start' | { x: number; z: number; facing: number }): void {
    const p = this.progress;
    document.body.classList.remove('ch8-dark');
    this.clearHorde();
    const endOn = p.flag('endgame') > 0;
    const village = new VillageScene(
      (spot) => this.interactVillage(spot),
      (id) => id !== 'stranger' || p.stoneCount >= 4,
      p.flag('home') > 0,
      arrival,
      {
        show: endOn,
        locked: endOn ? Object.fromEntries((['tower', 'rush', 'rift', 'trial'] as EndContent[]).map((c) => [c, endLock(p.data.end!, c) ?? undefined])) : {},
      },
    );
    this.loadLevel(village, false);
    this.run = null;
    this.hud.setLocation('차원마을', 0xffd88a);
    this.audio.playMusic('village');
    let grown = 0;
    while (p.count('bag_kit') > 0 && p.data.dimBag.length < DIM_BAG_MAX) {
      p.take('bag_kit', 1);
      p.data.dimBag.push(null);
      grown++;
    }
    if (grown) this.hud.toast(`차원가방이 ${p.data.dimBag.length}칸으로 늘어났습니다`, 3000);
    if (this.quests.refreshDaily(p.maxTier, p.flag('home') > 0, p.flag('endgame') > 0) && this.dailyUnlocked()) this.hud.toast('촌장 에단의 일일 의뢰가 새로 올라왔습니다', 3000);
    // 어제 시련·지난주 레이드 순위 보상 확인
    if (p.flag('endgame')) this.checkRankRewards();
    if (this.mode !== 'dialogue') this.mode = 'play';
    this.hud.setVisible(this.mode === 'play');
    this.refreshHud();
  }

  /** 던전 입장. run이 있으면 가방을 들고 다음 방으로 이어 간다 */
  private enterDungeon(tier: number, stage: number, background = false, farm?: FarmKind, end?: EndRun): void {
    const resuming = this.resumeFrom;
    const wait = end ? 0 : this.progress.bossWait(tier, stage);
    // 이어 하기인데 이 방의 보스를 이미 쓰러뜨렸다면 보스도, 대신 지키는 정예도 없이
    const boss = resuming?.bossKilled ? 'none' : wait > 0 ? 'guard' : 'present';
    let data;
    let mods: DungeonMods = {};
    let extraBosses: { tier: number; kind: 'midboss' | 'boss' }[] = [];
    let waves: WaveSpec[] = [];
    if (end) {
      const e = this.endLayout(end);
      extraBosses = e.extraBosses ?? [];
      tier = e.tier;
      stage = e.stage;
      data = e.gen.horde ? generateHordeField(randomSeed(), tier) : e.gen.tower ? (e.gen.arena ? generateTowerFloor(e.seed ?? randomSeed(), tier, 27, 11.6) : generateTowerFloor(randomSeed(), tier)) : generateDungeon(e.seed ?? randomSeed(), tier, stage, e.gen);
      waves = e.waves ?? [];
      mods = e.mods;
    } else data = generateDungeon(randomSeed(), tier, stage, farm ? { farm } : { boss });
    // 채집 특화 맵은 들어갈 때 30분 대기가 시작된다 (이어 하기는 제외)
    if (farm && !resuming && !background) this.progress.farmEntered(farm, FARM_COOLDOWN_MS);
    const dungeon = new DungeonScene(data, mods, {
      player: () => this.player.position,
      cameraQuat: () => this.camera.quaternion,
      hurtPlayer: (d, x, z, debuff, dot) => this.hurtPlayer(d, x, z, debuff, dot),
      monsterKilled: (m) => this.monsterKilled(m),
      monsterHitByProjectile: (m, proj) => this.combat.projectileHit(m, proj),
      exit: () => this.openWarp(),
      gather: (n) => this.startGather(n),
      shake: (a) => (this.shakeT = Math.max(this.shakeT, a)),
      killPlayer: () => {
        const pl = this.player;
        if (!pl.alive || this.mode !== 'play') return;
        pl.hurt(pl.hp + 1);
        this.hud.floatText(...Object.values(this.toScreen(pl.position.x, 2, pl.position.z)) as [number, number], '☠', '#ff2a6a', 'crit');
        this.shakeT = 1;
        this.mode = 'dead';
        this.deadTimer = 0;
        this.hud.setVisible(false);
        this.audio.play('fall');
      },
      announce: (t) => {
        this.hud.toast(t, 3000);
        this.audio.play('portal');
      },
    });
    if (waves.length) dungeon.startWaves(waves);
    // 보스 러시 하드·지옥: 보스 자리 곁에 다른 보스들
    if (extraBosses.length && dungeon.boss) {
      const b0 = dungeon.boss;
      extraBosses.forEach((b, i) => {
        const a = Math.PI + (i + 1) * ((Math.PI * 2) / (extraBosses.length + 1));
        dungeon.spawnBoss(b.kind, b.tier, b0.x + Math.cos(a) * 3.2, b0.z + Math.sin(a) * 3.2);
      });
    }
    this.bossTime = 0;
    this.timeOver = false;
    this.ambush = null;
    const continuing = !background && this.run !== null;
    const prevPlayer = this.player;
    this.loadLevel(dungeon, true);
    if (background) return;
    if (continuing && prevPlayer) {
      // 다음 방으로: 체력은 이어지되 조금 회복한다
      this.player.hp = Math.min(this.player.maxHp, prevPlayer.hp + this.player.maxHp * 0.25);
      this.player.mp = Math.min(this.player.maxMp, prevPlayer.mp + this.player.maxMp * 0.25);
      this.run!.tier = tier;
      this.run!.stage = stage;
      this.run!.roomCleared = false;
      this.run!.bossKilled = false;
      this.run!.farm = farm;
      this.run!.end = end;
    } else {
      const dim = new Bag(this.progress.data.dimBag.length, this.progress.data.dimBag);
      const bag = this.progress.invBag;
      const start = new Map<string, number>();
      for (const b of [bag, dim]) for (const [id, n] of b.totals()) start.set(id, (start.get(id) ?? 0) + n);
      const startEquips = new Set([...bag.equips(), ...dim.equips()].map((e) => e.uid));
      this.run = { tier, stage, bag, dimBag: dim, gold: 0, exp: 0, time: 0, stagesCleared: 0, roomCleared: false, start, startEquips, pouch: [], farm, end };
      // 저장된 체크포인트에서 이어 하기
      const cp = this.resumeFrom;
      if (cp) {
        this.resumeFrom = null;
        Object.assign(this.run, {
          gold: cp.gold,
          exp: cp.exp,
          time: cp.time,
          stagesCleared: cp.stagesCleared,
          start: new Map(cp.start),
          startEquips: new Set(cp.startEquips),
          pouch: [...cp.pouch],
          bossKilled: cp.bossKilled,
        });
      }
    }
    this.fillPouch();
    if (end?.kind === 'horde') this.beginHorde();
    else this.clearHorde();
    if (end?.kind === 'ch8') this.beginCh8(dungeon);
    else document.body.classList.remove('ch8-dark');
    if (end) this.applyStats();
    if (end) {
      this.hud.setLocation(this.endLabel(end, dungeon.theme.name), dungeon.theme.portalColor);
      this.audio.playMusic('dungeon');
      this.audio.play('portal');
      this.mode = 'play';
      this.hud.setVisible(true);
      this.hud.toast(this.endIntro(end), 4000);
      this.refreshHud();
      this.saveNow();
      return;
    }
    this.hud.setLocation(farm ? `${tier}단계 ${FARM_NAMES[farm]} · ${dungeon.theme.name}` : `${tier}-${stage} · ${dungeon.theme.name}`, dungeon.theme.portalColor);
    this.audio.playMusic('dungeon');
    this.audio.play('portal');
    this.mode = 'play';
    this.hud.setVisible(true);
    const note =
      wait > 0 ? ` — ${stage === 10 ? '수호자' : '파수꾼'}는 ${formatWait(wait)} 뒤 다시 나타납니다 (지금은 정예가 지킴)` : stage === 10 ? ' — 차원석을 지닌 수호자가 기다립니다' : stage === 5 ? ' — 파수꾼이 지키고 있습니다' : '';
    if (farm) this.hud.toast(`${tier}단계 ${FARM_NAMES[farm]} — ${farm === 'gold' ? '금화 더미를 부수면 골드가 쏟아집니다 (지키는 몬스터 주의)' : `${farm === 'wood' ? '나무' : '광맥'}가 가득합니다`}. 다음 입장은 30분 뒤`, 3500);
    else this.hud.toast(`${tier}-${stage} · ${dungeon.theme.name}${note}`, 3000);
    this.refreshHud();
    // 방에 들어올 때마다 체크포인트 저장
    this.saveNow();
  }

  private enterHome(): void {
    this.factory.size = this.progress.factorySize;
    const home = new HomeScene(
      this.factory,
      () => {
        this.saveNow();
        this.enterVillage('home');
      },
      (b) => this.openBuilding(b),
      () => this.openStorage(),
    );
    this.loadLevel(home, false);
    this.hud.setLocation(`차원집 · ${this.factory.size}×${this.factory.size}`, 0xc28cff);
    this.audio.playMusic('home');
    this.audio.play('portal');
    this.mode = 'play';
    this.hud.setVisible(true);
    this.refreshHud();
    if (this.progress.flag('homeTutorial') && !this.progress.flag('healerHint')) {
      this.progress.setFlag('healerHint');
      this.hud.toast('새 건물 마력 치유석: 건설 모드에서 짓고 마력선으로 발전기와 이으면, 곁에 서 있는 동안 HP·MP가 빠르게 찹니다', 5000);
    }
    if (!this.progress.flag('homeTutorial')) {
      this.progress.setFlag('homeTutorial');
      this.hud.toast('오른쪽 위 망치 버튼(B 키)으로 건설 모드를 엽니다', 4000);
    }
  }

  // =============== 메뉴 ===============
  private openMenu(open: () => void, onClosed?: () => void): void {
    this.mode = 'menu';
    this.hud.setVisible(false);
    this.buildBar.hide();
    this.setBigMap(false);
    open();
    if (onClosed) this.afterMenu = onClosed;
  }

  private resume(): void {
    this.mode = 'play';
    this.hud.setVisible(true);
    if (this.building) this.buildBar.show((t) => this.buildingUnlocked(t));
    this.input.clearPressed();
    this.applyStats();
    this.refreshHud();
    this.saveNow();
    const cb = this.afterMenu;
    this.afterMenu = null;
    cb?.();
  }

  private openPause(): void {
    const d = this.progress.data;
    this.openMenu(() =>
      this.screens.pause({
        inDungeon: this.level instanceof DungeonScene && !!this.run,
        seed: this.level instanceof DungeonScene ? this.level.grid.seed : undefined,
        returnStones: this.progress.count('return_stone'),
        shadows: d.settings.shadows,
        sound: d.settings.sound,
        onReturnStone: () => {
          if (!this.progress.take('return_stone', 1)) return;
          const k = this.run?.end?.kind;
          if (k === 'horde') return this.finishHorde();
          if (k === 'raid') return this.finishRaid(false);
          if (k === 'trial') return this.finishTrial(false);
          this.finishRun('귀환석으로 귀환');
        },
        onGiveUp: () => this.fall(),
        onBestiary: this.quests.isDone('m_research') ? () => this.openBestiary(false) : undefined,
        onEncyclopedia: () => this.screens.encyclopedia(this.progress, () => this.openPause()),
        onControls: () => this.openControls(),
        onAchievements: this.progress.flag('endgame') ? () => this.openAchievements(() => this.openPause()) : undefined,
        achReady: this.progress.flag('endgame') ? this.achClaimable() : 0,
        onFeedback: () => {
          const c = this.progress.cls;
          const cleared = this.progress.data.cleared;
          const where = this.run ? ` · 지금 ${this.run.end ? this.run.end.kind : `${this.run.tier}-${this.run.stage}`}` : '';
          this.screens.feedback(
            {
              version: GAME_VERSION,
              nickname: this.progress.data.nickname,
              cls: `${CLASSES[this.progress.data.currentClass].name} Lv.${c.level}`,
              progress: `${cleared >= 70 ? '전체 클리어' : `진행 ${Math.floor(cleared / 10) + 1}-${(cleared % 10) + 1}`}${this.progress.flag('endgame') ? ' · 엔딩 뒤' : ''}${where}`,
            },
            () => this.openPause(),
          );
        },
        foods: Object.keys(FOODS).map((id) => ({ id, count: this.progress.count(id) })).filter((f) => f.count > 0),
        foodLeft: d.food && d.food.until > Date.now() ? `${ITEMS[d.food.id].name} (${Math.ceil((d.food.until - Date.now()) / 60000)}분)` : undefined,
        onEat: (id) => {
          if (!this.progress.take(id, 1)) return;
          d.food = { id, until: Date.now() + FOOD_MINUTES * 60000 };
          this.audio.play('pickup');
          this.applyStats();
          this.saveNow();
          this.hud.toast(`${ITEMS[id].name}을(를) 먹었다! ${FOOD_MINUTES}분 동안 ${Object.entries(FOODS[id]).map(([k, v]) => bonusText(k as BonusKey, v!)).join(', ')}`, 3500);
          this.openPause();
        },
        autoAim: d.settings.autoAim !== false,
        onToggleAim: (on) => {
          d.settings.autoAim = on;
        },
        onToggleShadows: (on) => {
          d.settings.shadows = on;
          this.level.sun.castShadow = on;
        },
        music: d.settings.music ?? 0.7,
        sfx: d.settings.sfx ?? 0.8,
        onMusicVolume: (v) => {
          d.settings.music = v;
          this.audio.setMusicVolume(v);
        },
        onSfxVolume: (v) => {
          d.settings.sfx = v;
          this.audio.setSfxVolume(v);
        },
        onToggleSound: (on) => {
          d.settings.sound = on;
          this.audio.setEnabled(on);
        },
        onTitle: () => {
          this.saveNow();
          this.run = null;
          this.enterDungeon(1, 1, true);
          this.showTitle();
        },
        onSaveCode: () => {
          this.saveNow();
          void encodeSave(this.progress.data).then((code) => this.screens.saveCode(code, () => this.resume()));
        },
        onClose: () => this.resume(),
      }),
    );
  }

  /** 지금 들고 있는 일반 가방·차원가방 */
  private bags(): [Bag, Bag] {
    return this.run ? [this.run.bag, this.run.dimBag] : [this.progress.invBag, this.progress.dimBagObj];
  }

  private openBagOrInventory(): void {
    const [bag, dim] = this.bags();
    this.openMenu(() =>
      this.screens.bag(
        bag,
        dim,
        (from, i) => (from === 'bag' ? bag.moveTo(i, dim) : dim.moveTo(i, bag)) > 0,
        () => this.resume(),
        () => this.showInventory('equip'),
      ),
    );
  }

  private showInventory(tab: 'equip' | 'skills' | 'stats' | 'quest'): void {
    this.screens.inventory(this.progress, this.quests, tab, () => this.applyStats(), () => this.resume(), undefined, { bags: this.bags(), dungeon: !!this.run });
  }

  private openInventory(tab: 'equip' | 'skills' | 'stats' | 'quest'): void {
    this.openMenu(() => this.showInventory(tab));
  }

  private openStorage(): void {
    this.openMenu(() => this.screens.storage(this.progress, () => this.resume(), undefined, () => this.saveNow()));
  }

  /** 장비·스탯이 바뀌면 최대 HP/MP를 다시 계산한다 */
  /** HUD 왼쪽 위의 캐릭터 상반신 (지금 장비 모습) */
  private updatePortrait(): void {
    const cls = CLASSES[this.progress.data.currentClass];
    const gear = gearLook(this.progress.cls.equipment, this.progress.data.tools);
    const look = { ...cls.look, shield: cls.look.weapon === 'sword', hat: cls.look.weapon === 'staff' ? ('wizard' as const) : ('none' as const), gear };
    this.hud.setPortrait(bustUrl(`player:${cls.id}:${JSON.stringify(gear)}`, look), cls.short);
  }

  /** 버프를 반영한 능력치 (공격·치명·속도·방어) */
  private buffedStats(): Stats {
    const st = { ...this.progress.stats() };
    const pl = this.player;
    if (!pl) return st;
    let atk = 1;
    // 저주: 주는 피해 -30%
    if (pl.buff('curse')) atk *= 0.7;
    if (pl.buff('warcry')) {
      atk *= 1.25;
      st.speed *= 1.15;
    }
    if (pl.buff('focus')) atk *= 1.2;
    if (pl.buff('hunter')) {
      atk *= 1.15;
      st.crit += 30;
    }
    if (pl.buff('ironwall')) st.def = Math.round(st.def * 1.6);
    if (pl.buff('haste')) st.speed *= 1.2;
    // 무한 러쉬 축복
    const b = this.horde?.stacks;
    if (b) {
      atk *= 1 + 0.15 * (b.might ?? 0);
      st.speed *= 1 + 0.1 * (b.fury ?? 0);
      st.crit += 6 * (b.keen ?? 0);
    }
    st.atk = Math.round(st.atk * atk);
    return st;
  }

  private applyStats(): void {
    if (!this.player) return;
    const st = { ...this.progress.stats() };
    // 무한 러쉬 축복 (생명) · 균열 서약 (유리 몸)
    st.maxHp = Math.round(st.maxHp * (1 + 0.15 * (this.horde?.stacks.vital ?? 0)) * (this.runVow('glass') ? 0.6 : 1));
    const hpRatio = this.player.hp / this.player.maxHp;
    this.player.maxHp = st.maxHp;
    this.player.maxMp = st.maxMp;
    this.player.hp = Math.max(1, Math.round(st.maxHp * hpRatio));
    this.player.mp = Math.min(this.player.mp, st.maxMp);
    this.refreshGear();
    // 장비 모습이 바뀌면 플레이어를 새로 만들므로 그 뒤에 넣는다
    this.player.moveBonus = this.progress.bonus('move') + 0.08 * (this.horde?.stacks.swift ?? 0);
    this.player.dodgeCdMult = this.runVow('slowdodge') ? 2 : 1;
    // 8장 차원 규칙: 무중력(회피 거리 2배) · 공허(MP 재생 없음)
    this.player.dashMult = this.ch8Has('drift') ? 2 : 1;
    this.player.noMpRegen = this.ch8Has('void');
    this.player.mpRegenBonus = this.progress.bonus('mpRegen');
    this.player.hpRegenBonus = (this.specialTotals().regen ?? 0) / 100;
    this.player.dodgeCharges = 1 + Math.round(this.specialTotals().dodgeCharge ?? 0);
    this.player.dodgeBuffPct = this.specialTotals().dodgeBuff ?? 0;
  }

  /** 특수 옵션 합계 (장비·세트·유물 + 무한 러쉬 축복) */
  private specialTotals(): SpecialTotals {
    const t = { ...this.progress.specials() };
    for (const [k, v] of Object.entries(this.blessSpecials()) as [keyof SpecialTotals, number][]) t[k] = (t[k] ?? 0) + v;
    return t;
  }
  /** 무한 러쉬 축복이 주는 특수 옵션 (러쉬가 아니면 없음) */
  private blessSpecials(): SpecialTotals {
    const b = this.horde?.stacks;
    if (!b) return {};
    const n = (k: BlessId) => b[k] ?? 0;
    return { critDmg: 15 * n('keen'), killHeal: n('vamp'), skillDmg: 10 * n('focus'), dmgReduce: 6 * n('guard'), dodgeCharge: n('reach'), dodgeBuff: 20 * n('reach') };
  }
  /** 지금 판이 이 균열 서약을 걸었는지 */
  private runVow(v: VowId): boolean {
    const e = this.run?.end;
    return e?.kind === 'rift' && !!e.vows?.includes(v);
  }

  private gearKey = '';
  /** 고급 상자 습격 중인 몬스터 무리 */
  private ambush: { monsters: import('./Monster').Monster[]; tier: number } | null = null;
  /** 이어 하기: 다음 enterDungeon이 이 체크포인트로 run을 만든다 */
  private resumeFrom: RunCheckpoint | null = null;
  private timerAcc = 1;
  private freshLoad = false;
  private healFx = 0;
  /** 이번 방 보스와 싸운 시간 */
  private bossTime = 0;
  private timeOver = false;
  /** 장비가 바뀌면 캐릭터 모델을 새 장비 모습으로 다시 만든다 (위치·HP·방향은 그대로) */
  private refreshGear(): void {
    const gear = gearLook(this.progress.cls.equipment, this.progress.data.tools);
    const key = JSON.stringify(gear);
    if (key === this.gearKey || !this.player) return;
    this.gearKey = key;
    const prev = this.player;
    const next = new Player(this.playerMaterial, prev.cls, gear);
    next.facing = prev.facing;
    next.setPosition(prev.position.x, prev.position.z);
    next.maxHp = prev.maxHp;
    next.maxMp = prev.maxMp;
    next.hp = prev.hp;
    next.mp = prev.mp;
    // 버프·재사용 대기·보너스도 그대로 옮긴다 (예전엔 장비를 바꾸면 사라졌다)
    next.buffs = prev.buffs;
    next.rollCooldown = prev.rollCooldown;
    next.dodgeCharges = prev.dodgeCharges;
    next.dodgeStock = prev.dodgeStock;
    next.dodgeMax = prev.dodgeMax;
    next.moveBonus = prev.moveBonus;
    next.mpRegenBonus = prev.mpRegenBonus;
    prev.rig.root.parent?.remove(prev.rig.root);
    this.level.scene.add(next.rig.root);
    this.player = next;
    this.applyAura();
    this.updatePortrait();
  }

  private openExpand(): void {
    this.openMenu(() =>
      this.screens.factoryExpand(
        this.progress,
        () => {
          const p = this.progress;
          const next = FACTORY_SIZES[p.data.factory.sizeLevel + 1];
          if (!next?.cost || p.data.gold < next.cost.gold || !p.takeAll(next.cost.items)) return;
          p.data.gold -= next.cost.gold;
          p.data.factory.sizeLevel++;
          this.audio.play('level');
          this.afterMenu = () => {
            this.building = false;
            this.enterHome();
            this.hud.toast(`차원집이 ${p.factorySize}×${p.factorySize}로 넓어졌습니다`);
          };
          this.screens.close();
        },
        () => this.resume(),
      ),
    );
  }

  private setBigMap(on: boolean): void {
    this.bigMap = on && !!this.minimap;
    this.hud.showBigMap(this.bigMap ? this.minimap!.bigCanvas : null);
    this.minimapTimer = 0;
  }

  // =============== 마을 상호작용 ===============
  private interactVillage(spot: VillageSpot): void {
    const p = this.progress;
    switch (spot) {
      case 'portal':
        this.openStageSelect(p.maxTier);
        break;
      case 'home':
        if (!p.flag('home')) this.hud.toast('문이 굳게 닫혀 있다. 세라라면 방법을 알지도 모른다.');
        else {
          this.saveNow();
          this.enterHome();
        }
        break;
      case 'forge':
        this.openMenu(() => this.screens.forge(p, () => this.checkTitles(), () => this.resume()));
        break;
      case 'shop':
        this.openMenu(() => this.screens.shop(p, () => this.audio.play('coin'), () => this.resume()));
        break;
      case 'hall':
        this.openMenu(() =>
          this.screens.classHall(
            p,
            (id) => {
              this.afterMenu = () => this.switchClass(id);
              this.screens.close();
            },
            () => this.resume(),
          ),
        );
        break;
      case 'storage':
        this.openStorage();
        break;
      case 'tower':
      case 'rush':
      case 'rift':
      case 'trial': {
        const lock = endLock(p.data.end!, spot);
        if (lock) {
          this.hud.toast(`${END_NAMES[spot]}: ${lock}`, 3000);
          break;
        }
        this.openEndgameMenu(spot);
        break;
      }
      default:
        this.talk(spot);
    }
  }

  private openStageSelect(tier: number): void {
    this.openMenu(() =>
      this.screens.stageSelect(
        this.progress,
        tier,
        (t, s) => {
          this.afterMenu = () => this.enterDungeon(t, s);
          this.screens.close();
        },
        () => this.resume(),
        (t, kind) => {
          if (this.progress.farmWait(kind) > 0 || !this.progress.farmUnlocked(t)) return;
          this.afterMenu = () => this.enterDungeon(t, 1, false, kind);
          this.screens.close();
        },
        () => this.openEndgameMenu('rift'),
        (stage) => {
          if (stage > (this.progress.data.ch8?.cleared ?? 0) + 1) return;
          this.afterMenu = () => this.enterDungeon(7, stage, false, undefined, { kind: 'ch8', stage });
          this.screens.close();
        },
      ),
    );
  }

  /** NPC와 대화: 퀘스트 보고 → 이야기 → 새 퀘스트 → 진행 중 안내 → 인사와 시설 */
  /**
   * NPC와 대화: 먼저 인사말, 그 아래에서 이야기·퀘스트(보고·새 퀘스트·진행 중)·시설(상점·도면…)을 골라 이어 간다.
   * 퀘스트 대사가 끝나면 다시 이 선택지로 돌아온다
   */
  private talk(npc: NpcId): void {
    const p = this.progress;
    const q = this.quests;
    const ref = npc as NpcRef;
    const back = () => this.talk(npc);
    type Opt = { label: string; kind: 'story' | 'report' | 'offer' | 'pending' | 'service' | 'leave'; pick: () => void };
    const opts: Opt[] = [];
    const run = (f: () => void) => () => {
      this.screens.close();
      f();
    };

    if (hasStory(npc, p)) {
      const script = scriptFor(npc, p);
      opts.push({
        label: '이야기하기',
        kind: 'story',
        pick: run(() => {
          if (script === 'stone_n') p.setFlag(`stoneTalk${p.stoneCount}`);
          this.playScript(script, back);
        }),
      });
    }
    for (const x of q.activeFor(ref).filter((x) => q.canComplete(x)))
      opts.push({ label: `보고하기: ${x.title}`, kind: 'report', pick: run(() => this.playSteps(x.complete, () => this.completeQuest(x, back))) });
    // 받을 수 있는 퀘스트는 모두 (서브 퀘스트 여러 개를 함께 진행할 수 있다)
    for (const x of q.available(ref))
      opts.push({ label: `${x.kind === 'main' ? '[메인] ' : '[서브] '}${x.title}`, kind: 'offer', pick: run(() => this.playSteps(x.offer, () => this.offerQuest(x, back))) });
    for (const x of q.activeFor(ref).filter((x) => !q.canComplete(x) && x.pending))
      opts.push({ label: `${x.title} (진행 중)`, kind: 'pending', pick: run(() => this.playSteps(x.pending!, back)) });
    const service = this.npcServiceLabel(npc);
    if (service) opts.push({ label: service, kind: 'service', pick: run(() => this.npcService(npc)) });
    for (const x of this.npcExtra(npc)) opts.push({ label: x.label, kind: 'service', pick: run(x.pick) });
    opts.push({ label: '대화 끝내기', kind: 'leave', pick: () => this.screens.close() });

    const idle = SCRIPTS[`${npc}_idle`]?.[0];
    const def = NPCS.find((n) => n.id === npc)!;
    this.openMenu(() => this.screens.npcTalk(def.name, idle && 't' in idle ? String(idle.t) : '…', opts, () => this.resume()));
  }

  /** NPC 기능 버튼 이름 (없으면 null) */
  private npcServiceLabel(npc: NpcId): string | null {
    const q = this.quests;
    switch (npc) {
      case 'merchant':
        return '거래하기 (상점)';
      case 'smith':
        return '강화·수리·각인 (대장간)';
      case 'trainer':
        return '스킬 배우기·강화';
      case 'researcher':
        return q.isDone('m_research') ? '몬스터 도감 보상' : null;
      case 'engineer':
        return q.isDone('m4_factory') ? '도면 보기' : null;
      case 'chief':
        return this.dailyUnlocked() ? '일일 의뢰' : null;
      default:
        return null;
    }
  }

  /** v10: 엔딩 뒤 NPC 추가 기능 (???: 증표 교환 · 노아: 유물 복원 · 촌장: 업적) */
  private npcExtra(npc: NpcId): { label: string; pick: () => void }[] {
    const p = this.progress;
    if (!p.flag('endgame')) return [];
    const change = () => {
      this.applyStats();
      this.saveNow();
    };
    if (npc === 'stranger') return [{ label: `증표 교환 (영겁의 증표 ${p.count('eon_mark')})`, pick: () => this.openMenu(() => this.screens.exchange(p, change, () => this.resume())) }];
    if (npc === 'researcher')
      return [
        { label: '유물 복원·장착', pick: () => this.openMenu(() => this.screens.relics(p, change, () => this.resume())) },
        ...(p.data.unlockedClasses.includes('summoner') ? [{ label: '차원 계약 (소환사)', pick: () => this.openMenu(() => this.screens.pacts(p, change, () => this.resume())) }] : []),
      ];
    return [];
  }

  /** NPC 고유 기능. 퀘스트 진행 중이어도 언제나 쓸 수 있다 */
  private npcService(npc: NpcId): void {
    const p = this.progress;
    if (npc === 'merchant') this.interactVillage('shop');
    else if (npc === 'smith') this.interactVillage('forge');
    else if (npc === 'trainer') this.openSkillShop();
    else if (npc === 'researcher' && this.quests.isDone('m_research')) this.openBestiary(true);
    else if (npc === 'engineer' && this.quests.isDone('m4_factory')) this.openBlueprints();
    else if (npc === 'chief' && this.dailyUnlocked()) this.openDaily();
    else if (npc === 'chief' && !this.dailyUnlocked() && p.flag('intro')) this.hud.toast('첫 던전을 다녀오면 촌장의 일일 의뢰를 받을 수 있습니다', 2500);
  }

  /** 몬스터 도감. canClaim: 연구자 노아 앞에서만 보상을 받는다 */
  private openBestiary(canClaim: boolean): void {
    this.openMenu(() =>
      this.screens.bestiary(
        this.progress,
        canClaim,
        () => {
          this.audio.play('coin');
          this.applyStats();
          this.saveNow();
        },
        () => this.resume(),
      ),
    );
  }

  /** 촌장 일일 의뢰: 첫 퀘스트(1-1 사냥)를 끝내면 열린다 */
  private dailyUnlocked(): boolean {
    return this.quests.isDone('m1_hunt') || this.progress.flag('legend') > 0;
  }

  private offerQuest(qd: QuestDef, after?: () => void): void {
    this.openMenu(
      () =>
      this.screens.questOffer(
        qd,
        () => {
          this.quests.accept(qd);
          for (const f of qd.onAccept?.flags ?? []) this.progress.setFlag(f);
          for (const [id, n] of Object.entries(qd.onAccept?.items ?? {})) this.progress.add(id, n);
          this.audio.play('pickup');
          this.hud.toast(`퀘스트 수락: ${qd.title}${qd.onAccept?.flags?.includes('tool_pickaxe') ? ' · 곡괭이와 도끼를 받았다!' : ''}`, 3000);
          this.screens.close();
        },
        () => this.resume(),
      ),
      after,
    );
  }

  private completeQuest(qd: QuestDef, after?: () => void): void {
    const p = this.progress;
    if (!this.quests.canComplete(qd)) return;
    for (const o of qd.objectives) if (o.type === 'deliver') p.take(o.item, o.count);
    this.quests.finish(qd);
    const r = qd.rewards;
    if (r.gold) p.data.gold += r.gold;
    for (const [id, n] of Object.entries(r.items ?? {})) p.add(id, n);
    for (const f of r.flags ?? []) p.setFlag(f);
    if (r.exp) this.gainExp(r.exp);
    this.audio.play('coin');
    const parts = [r.gold ? `${r.gold} G` : '', r.exp ? `경험치 ${r.exp}` : '', ...Object.entries(r.items ?? {}).map(([id, n]) => `${ITEMS[id].name}×${n}`)].filter(Boolean);
    this.hud.toast(`퀘스트 완료: ${qd.title}${parts.length ? ` (${parts.join(', ')})` : ''}`, 3500);
    this.saveNow();
    if (r.script) {
      const pos = { ...this.player.position, facing: this.player.facing };
      this.playScript(r.script, () => {
        // 차원집이 열리면 문이 빛나도록 마을을 다시 만든다 (서 있던 자리 그대로)
        if (r.flags?.includes('home') && this.level instanceof VillageScene) this.enterVillage(pos);
        else after?.();
      });
    } else after?.();
    this.refreshHud();
  }

  private openSkillShop(message?: string): void {
    this.openMenu(() =>
      this.screens.skillShop(
        this.progress,
        (i) => {
          const p = this.progress;
          const c = p.cls;
          const lv = c.skills[i] ?? 0;
          const cost = lv === 0 ? SKILL_LEARN[i] : lv < MAX_SKILL_LEVEL ? skillUpgradeCost(i, lv) : null;
          if (!cost || c.level < cost.level || p.data.gold < cost.gold || !p.hasAll(cost.items ?? {})) return;
          p.data.gold -= cost.gold;
          p.takeAll(cost.items ?? {});
          c.skills[i] = lv + 1;
          // 새로 배운 스킬은 빈 퀵슬롯에 자동으로 놓는다
          if (lv === 0 && !c.quick.includes(i)) {
            const empty = c.quick.indexOf(-1);
            if (empty >= 0) c.quick[empty] = i;
          }
          this.audio.play('level');
          const name = CLASSES[p.data.currentClass].skills[i].name;
          this.openSkillShop(lv === 0 ? `${name}을(를) 배웠습니다!` : `${name} Lv.${lv + 1}`);
        },
        () => this.resume(),
        message,
        (u) => {
          const p = this.progress;
          const c = p.cls;
          if (!p.unlockedUlts().includes(u)) return;
          const lv = p.ultLevel(u);
          const cost = ultUpgradeCost(lv);
          if (!cost || c.level < cost.level || p.data.gold < cost.gold || !p.hasAll(cost.items)) return;
          p.data.gold -= cost.gold;
          p.takeAll(cost.items);
          const lvs = c.ultLv ?? [1, 1];
          lvs[u] = lv + 1;
          c.ultLv = lvs;
          this.audio.play('level');
          this.saveNow();
          this.openSkillShop(`궁극기 ${ULTIMATES[p.data.currentClass][u].name} Lv.${lv + 1}!`);
        },
        (key, branch) => {
          const p = this.progress;
          const c = p.cls;
          const ult = key.startsWith('u');
          const i = Number(key.slice(1));
          const def = (ult ? ULT_AWAKEN : SKILL_AWAKEN)[p.data.currentClass][i];
          const name = ult ? ULTIMATES[p.data.currentClass][i].name : CLASSES[p.data.currentClass].skills[i].name;
          if (branch === null) {
            // 각성하기: 최고 레벨 + 최고급 재료
            const maxed = ult ? p.unlockedUlts().includes(i) && p.ultLevel(i) >= MAX_ULT_LEVEL : (c.skills[i] ?? 0) >= MAX_SKILL_LEVEL;
            const cost = awakenCost(ult);
            if (!maxed || c.awaken?.[key] || p.data.gold < cost.gold || !p.hasAll(cost.items)) return;
            p.data.gold -= cost.gold;
            p.takeAll(cost.items);
            (c.awaken ??= {})[key] = 'A';
            this.audio.play('stone');
            this.saveNow();
            return this.openSkillShop(`:sparkle: ${name} 각성! 지금은 A · ${def.a.name} — 아래에서 B · ${def.b.name}(으)로 바꿀 수 있습니다`);
          }
          if (!c.awaken?.[key]) return;
          c.awaken[key] = branch;
          this.saveNow();
          this.openSkillShop(`${name}: ${branch} · ${branch === 'A' ? def.a.name : def.b.name}`);
        },
      ),
    );
  }

  /** 촌장에게 보고할 수 있는 일일 의뢰가 있는지 */
  private dailyReady(): boolean {
    const p = this.progress;
    const ctx = { count: (id: string) => p.count(id), stones: p.stoneCount, cleared: p.data.cleared, flag: (f: string) => p.flag(f), discovered: p.discovered };
    return this.quests.state.daily.list.some((d) => d.accepted && !d.claimed && objectiveProgress(d.objective, d.progress, ctx) >= objectiveNeed(d.objective));
  }

  private openDaily(): void {
    this.quests.refreshDaily(this.progress.maxTier, this.progress.flag('home') > 0, this.progress.flag('endgame') > 0);
    this.openMenu(() =>
      this.screens.dailyBoard(
        this.progress,
        this.quests,
        (i) => {
          const d = this.quests.state.daily.list[i];
          if (!d || d.claimed) return;
          const p = this.progress;
          // 납품 의뢰는 물건을 건넨다
          if (d.objective.type === 'deliver' && !p.take(d.objective.item, d.objective.count)) return;
          d.claimed = true;
          if (d.reward.gold) p.data.gold += d.reward.gold;
          for (const [id, n] of Object.entries(d.reward.items ?? {})) p.add(id, n);
          if (d.reward.exp) this.gainExp(d.reward.exp);
          this.audio.play('coin');
          this.hud.toast(`일일 의뢰 완료: ${d.title}`);
          this.openDaily();
        },
        (i) => {
          const d = this.quests.state.daily.list[i];
          if (!d || d.accepted) return;
          d.accepted = true;
          d.progress = 0;
          this.audio.play('pickup');
          this.hud.toast(`일일 의뢰 수락: ${d.title}`);
          this.openDaily();
        },
        () => this.resume(),
      ),
    );
  }

  private openBlueprints(message?: string): void {
    this.openMenu(() =>
      this.screens.blueprints(
        this.progress,
        (t) => {
          const p = this.progress;
          const bp = BUILDINGS[t].blueprint;
          const req = PRODUCER_TYPES.has(t) ? PRODUCER_UNLOCK[t as ProducerType] : null;
          if (req && !(req === 'clear7' ? p.data.cleared >= 70 : p.flag('endgame') > 0)) return;
          if (!bp || p.flag(`bp_${t}`) || p.data.gold < bp.gold || !p.hasAll(bp.items)) return;
          p.takeAll(bp.items);
          p.data.gold -= bp.gold;
          p.setFlag(`bp_${t}`);
          this.audio.play('coin');
          this.openBlueprints(`${BUILDINGS[t].name} 도면을 샀습니다`);
        },
        () => this.resume(),
        message,
        (t, lv) => {
          const p = this.progress;
          const cost = upgradeBlueprintCost(t, lv);
          if (p.flag(`bp_${t}_lv${lv}`) || p.maxTier < lv || p.data.gold < cost.gold || !p.takeAll(cost.items)) return;
          p.data.gold -= cost.gold;
          p.setFlag(`bp_${t}_lv${lv}`);
          this.audio.play('coin');
          this.openBlueprints(`${BUILDINGS[t].name} Lv.${lv} 강화 도면을 샀습니다. 차원집에서 건물을 눌러 업그레이드하세요`);
        },
      ),
    );
  }

  private switchClass(id: ClassId): void {
    if (id === this.progress.data.currentClass) return;
    this.progress.data.currentClass = id;
    const pos = { ...this.player.position };
    this.makePlayer(pos.x, pos.z, this.player.facing, false, true);
    this.level.effects.pillar(pos.x, pos.z, CLASSES[id].look.tunic);
    this.audio.play('level');
    this.hud.toast(`${CLASSES[id].name}(으)로 전환했습니다`);
    this.refreshHud();
  }

  // =============== 스토리 ===============
  private playScript(id: string, after?: () => void): void {
    this.progress.setFlag(`seen_${id}`);
    this.playSteps(null, after, id);
  }

  private playSteps(steps: Step[] | null, after?: () => void, scriptId?: string): void {
    this.mode = 'dialogue';
    this.hud.setVisible(false);
    this.setBigMap(false);
    const done = () => {
      if (this.pendingEndgame) {
        this.pendingEndgame = false;
        this.openEndgame();
        return;
      }
      this.mode = 'play';
      this.hud.setVisible(true);
      this.input.clearPressed();
      this.refreshHud();
      this.saveNow();
      after?.();
    };
    if (scriptId) this.dialogue.play(scriptId, done);
    else this.dialogue.playSteps(steps ?? [], done);
  }

  private runCommand(cmd: string): void {
    const p = this.progress;
    switch (cmd) {
      case 'unlockHome':
        p.setFlag('home');
        this.audio.play('stone');
        break;
      case 'unlockMage':
        p.unlockClass('mage');
        this.audio.play('level');
        break;
      case 'unlockArcher':
        p.unlockClass('archer');
        this.audio.play('level');
        break;
      case 'unlockSummoner':
        p.unlockClass('summoner');
        this.audio.play('level');
        break;
      case 'endgame':
        this.pendingEndgame = true;
        break;
    }
  }

  // =============== 차원의 끝 (엔드 콘텐츠) ===============
  /** 엔드 콘텐츠 한 판의 맵과 몬스터 배율 */
  private endLayout(end: EndRun): { tier: number; stage: number; gen: GenOptions; mods: DungeonMods; seed?: number; extraBosses?: { tier: number; kind: 'midboss' | 'boss' }[]; waves?: WaveSpec[] } {
    switch (end.kind) {
      case 'trial': {
        // 주간 시련: 이번 주의 수호자 한 마리 (시작 방 + 보스 방). 체력이 아주 많고, 깎일수록 격노한다
        const t = trialSpec(end.week);
        return {
          tier: t.tier,
          stage: 10,
          seed: t.seed,
          gen: { boss: 'present', rooms: [2, 2] },
          mods: { statTier: 7, statStage: 10, hp: TRIAL_HP, trial: true },
        };
      }
      case 'tower': {
        // 둥근 단 하나에서 웨이브 3번. 5·10층은 마지막 웨이브에 보스
        const b = towerBoss(end.floor);
        const m = towerMult(end.floor);
        const more = Math.min(6, Math.floor(end.floor / 10));
        return {
          tier: b ? b.tier : towerTheme(end.floor),
          stage: 1,
          gen: { tower: true },
          mods: { statTier: 7, statStage: 10, hp: m, atk: m },
          waves: [
            { normals: 8 + more, elites: end.floor >= 20 ? 1 : 0 },
            { normals: 7 + more, elites: 2 },
            b ? { normals: 4, elites: 0, bosses: [b] } : { normals: 6 + more, elites: 3 },
          ],
        };
      }
      case 'rush': {
        // 한 전투의 보스들: 첫 보스가 맵의 보스 자리, 나머지는 곁에 함께 나온다
        const [first, ...rest] = rushFights(end.diff)[end.index];
        const d = RUSH_DIFFS[end.diff];
        return {
          tier: first.tier,
          stage: first.kind === 'boss' ? 10 : 5,
          gen: { boss: 'present', rooms: [2, 2] },
          mods: { statTier: 7, statStage: 10, hp: d.hp, atk: d.atk },
          extraBosses: rest,
        };
      }
      case 'rift': {
        const a = end.affixes;
        const v = end.vows ?? [];
        const m = riftMult(end.level);
        return {
          tier: end.tier,
          stage: 4,
          gen: { boss: 'present', rooms: [5, 6], monsterMult: a.includes('swarm') ? 1.4 : 1, eliteChance: (a.includes('elite') ? 0.15 : 0) + (v.includes('elite') ? 0.25 : 0), nodeMult: RIFT_NODE_MULT },
          mods: {
            statTier: 7,
            statStage: 10,
            hp: m * (a.includes('fortified') ? 1.3 : 1) * (v.includes('tough') ? 1.6 : 1),
            atk: m * (a.includes('enraged') ? 1.25 : 1) * (v.includes('brutal') ? 1.6 : 1),
            speed: a.includes('haste') ? 1.2 : 1,
            affixes: a,
          },
        };
      }
      case 'raid': {
        // 주간 레이드: 넓은 둥근 투기장 한가운데에 레이드 보스 한 마리
        const r = raidSpec(end.week);
        return {
          tier: r.boss.tier,
          stage: 1,
          seed: r.seed,
          gen: { tower: true, arena: 'raid' },
          mods: { statTier: 7, statStage: 10, hp: RAID_HP, raid: true },
          waves: [{ normals: 0, elites: 0, bosses: [{ kind: 'boss', tier: r.boss.tier, species: RAID_SPECIES[r.boss.id] }] }],
        };
      }
      case 'ch8': {
        // 8장: 7단계 맵 구조에 차원 테마·8장 몬스터. 파수꾼·수문장은 보통 보스처럼 다시 나타나기까지 기다린다
        const wait = this.progress.bossWait(8, end.stage);
        const m = ch8Mult(end.stage);
        return {
          tier: 7,
          stage: end.stage,
          gen: { boss: wait > 0 ? 'guard' : 'present' },
          mods: { statTier: 7, statStage: 10, hp: m, atk: m * 0.85, theme: CH8_THEME, pool: TIER_POOLS[8], bosses: { midboss: CH8_MIDBOSS, boss: CH8_BOSS } },
        };
      }
      case 'horde':
        // 무한 러쉬: 넓은 벌판. 몬스터는 게임이 시간에 맞춰 사방에서 불러낸다
        return { tier: 7, stage: 1, gen: { horde: true }, mods: { statTier: 7, statStage: 10, hp: hordeMult(0), atk: hordeMult(0), endless: true, pool: HORDE_POOL } };
    }
  }

  private endLabel(end: EndRun, theme: string): string {
    if (end.kind === 'ch8') return `8-${end.stage} · ${CH8_STAGES[end.stage - 1].name} · ${CH8_STAGES[end.stage - 1].rules.map((r) => CH8_RULES[r].name).join('·')}`;
    if (end.kind === 'raid') return `주간 차원 레이드 · ${raidSpec(end.week).boss.name} · :hourglass: ${formatClock(Math.max(0, RAID_TIME - this.bossTime))}`;
    if (end.kind === 'horde') return `무한 러쉬 · 처치 ${end.kills} · ${formatClock(end.time)}`;
    if (end.kind === 'trial') return `일일 차원 시련 · ${BOSS_SPECIES[trialSpec(end.week).tier - 1].name} · :hourglass: ${formatClock(Math.max(0, TRIAL_TIME - this.bossTime))}`;
    if (end.kind === 'tower') return `무한의 탑 ${end.floor}층 · ${theme}`;
    if (end.kind === 'rush') return `보스 러시 ${RUSH_DIFFS[end.diff].name} ${end.index + 1}/${rushFights(end.diff).length}`;
    const t = Math.max(0, Math.ceil(end.timeLeft));
    return `심연 균열 ${end.level}단계 · ${theme} · :hourglass: ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  private endIntro(end: EndRun): string {
    if (end.kind === 'ch8') {
      const st = CH8_STAGES[end.stage - 1];
      const wait = this.progress.bossWait(8, end.stage);
      const boss = end.stage === 10 ? (wait > 0 ? ` — 수문장은 ${formatWait(wait)} 뒤 다시 나타납니다` : ' — 차원 포탈의 수문장이 기다립니다') : end.stage === 5 ? (wait > 0 ? ` — 파수꾼은 ${formatWait(wait)} 뒤 다시 나타납니다` : ' — 시간의 파수꾼이 지키고 있습니다') : '';
      return `8-${end.stage} ${st.name} · 차원 규칙: ${st.rules.map((r) => `${CH8_RULES[r].name} (${CH8_RULES[r].text})`).join(' / ')}${boss}`;
    }
    if (end.kind === 'raid') return `주간 차원 레이드 — ${raidSpec(end.week).boss.name}을(를) ${formatClock(RAID_TIME)} 안에 쓰러뜨리자 · 8·4줄에서 보호막, 10%마다 격노`;
    if (end.kind === 'horde') return '무한 러쉬 — 차원의 틈에서 몬스터가 끝없이 쏟아진다! 쓰러질 때까지 버티며 최대한 많이 처치하자';
    if (end.kind === 'trial')
      return `일일 차원 시련 (${end.week}) — ${BOSS_SPECIES[trialSpec(end.week).tier - 1].name}에게 ${formatClock(TRIAL_TIME)} 동안 최대한 피해를 주자 · 체력 10%마다 격노 단계가 오른다`;
    if (end.kind === 'tower') {
      const b = towerBoss(end.floor);
      return `무한의 탑 ${end.floor}층 — 몬스터 ×${towerMult(end.floor).toFixed(2)}${b ? ` · ${b.kind === 'boss' ? '수호자' : '파수꾼'}가 기다립니다` : ''}${end.floor > 10 && end.floor % 10 === 1 ? ' · :warning: 새 구간: 몬스터가 한꺼번에 강해졌다' : ''}`;
    }
    if (end.kind === 'rush') {
      return `보스 러시 ${end.index + 1}/${rushFights(end.diff).length} — ${rushFightName(rushFights(end.diff)[end.index])}`;
    }
    const aff = end.affixes.map((a) => AFFIXES[a].name).join(' · ');
    const vw = (end.vows ?? []).map((v) => VOWS[v].name).join(' · ');
    return `심연 균열 ${end.level}단계 — ${Math.floor(end.timeLeft / 60)}분 안에 모두 쓰러뜨리자${aff ? ` · 변이: ${aff}` : ''}${vw ? ` · 서약: ${vw} (보상 ×${vowMult(end.vows).toFixed(2)})` : ''}`;
  }

  /** 보스 러시 오늘 쓴 횟수 (날짜가 바뀌면 0) */
  private rushUsedToday(): number {
    const e = this.progress.data.end!;
    if (e.rushDate !== todayKey()) {
      e.rushDate = todayKey();
      e.rushUsed = 0;
    }
    return e.rushUsed;
  }

  /** 차원의 끝: 콘텐츠 고르기 */
  private endView: EndContent = 'tower';
  private openEndgameMenu(view: EndContent | null = null, message?: string): void {
    if (view) this.endView = view;
    const only = this.endView;
    const p = this.progress;
    const e = p.data.end!;
    this.rushUsedToday();
    this.trialRecord();
    this.raidRecord();
    this.checkRankRewards();
    this.openMenu(() =>
      this.screens.endgame(
        p,
        {
          tower: (floor) => {
            this.afterMenu = () => this.enterDungeon(1, 1, false, undefined, { kind: 'tower', floor });
            this.screens.close();
          },
          towerDaily: () => {
            if (e.towerDailyDate === todayKey() || e.towerBest < 1) return;
            const r = towerDaily(e.towerBest);
            e.towerDailyDate = todayKey();
            p.data.gold += r.gold;
            if (r.dust) p.add(DUST, r.dust);
            this.audio.play('coin');
            this.saveNow();
            this.openEndgameMenu(null, `탑 소탕 보상: +${r.gold} G${r.dust ? ` · 차원 가루 ${r.dust}개` : ''}`);
          },
          rush: (diff) => {
            if (diff > 0 && !e.rushGradeBest[diff - 1]) return;
            const used = this.rushUsedToday();
            const cost = rushEntry(diff, used);
            if (!p.hasAll(cost)) return this.openEndgameMenu(null, `입장 재료가 부족합니다: ${Object.entries(cost).map(([id, n]) => `${ITEMS[id].name} ${n}개`).join(', ')}`);
            p.takeAll(cost);
            if (diff < 2) e.rushUsed = used + 1;
            this.saveNow();
            this.afterMenu = () => this.enterDungeon(1, 1, false, undefined, { kind: 'rush', diff, index: 0 });
            this.screens.close();
          },
          trial: () => this.startTrial(),
          trialAura: (g) => {
            const t = this.trialRecord();
            if (g > t.topGrade) return;
            p.data.aura = g;
            this.applyAura();
            this.saveNow();
            this.openEndgameMenu(null, g < 0 ? '오라를 껐습니다' : `발밑 오라: ${TRIAL_GRADES[g].aura}`);
          },
          rift: (tier, level, vows) => {
            if (level > e.riftBest + 1 || tier > p.maxTier) return;
            const cost = riftEntry(level);
            if (p.count(cost.id) < cost.n) return this.openEndgameMenu(null, `심연 균열 ${level}단계에 들어가려면 ${ITEMS[cost.id].name} ${cost.n}개가 필요합니다 (차원집 제작대)`);
            p.take(cost.id, cost.n);
            e.vows = [...vows];
            this.saveNow();
            this.afterMenu = () => this.enterDungeon(tier, 1, false, undefined, { kind: 'rift', tier, level, affixes: riftAffixes(level, todayKey()), timeLeft: vows.includes('hurry') ? HURRY_TIME : RIFT_TIME, vows: [...vows] });
            this.screens.close();
          },
          raid: () => this.startRaid(),
          horde: () => this.startHorde(),
          hordeDaily: () => {
            const hr = this.hordeRecord();
            if (hr.dailyDate === todayKey() || hr.best < 1) return;
            const r = hordeDaily(hr.best);
            hr.dailyDate = todayKey();
            p.data.gold += r.gold;
            if (r.marks) p.add(MARK, r.marks);
            this.audio.play('coin');
            this.saveNow();
            this.openEndgameMenu(null, `무한 러쉬 일일 보상: +${r.gold.toLocaleString()} G${r.marks ? ` · 영겁의 증표 ${r.marks}개` : ''}`);
          },
          view: (c) => {
            const lock = endLock(e, c);
            if (lock) return this.openEndgameMenu(null, `${END_NAMES[c]}: ${lock}`);
            this.openEndgameMenu(c);
          },
        },
        () => this.resume(),
        message,
        undefined,
        only,
      ),
    );
  }

  /** 새로 얻은 칭호가 있으면 알린다 (칭호 보너스는 바로 능력치에 반영) */
  private checkTitles(): void {
    const p = this.progress;
    const ctx = {
      end: p.data.end!,
      transcend: Math.max(...CLASS_ORDER.map((c) => p.data.classes[c].tlv ?? 0)),
      trialTop: p.data.end?.trial?.topGrade ?? -1,
      trialWeeks: p.data.end?.trial?.weeks ?? 0,
      ach: p.data.ach?.done ?? [],
      engrave5: CLASS_ORDER.reduce((a, c) => a + Object.values(p.data.classes[c].equipment).filter((e) => (e?.eng?.length ?? 0) >= 5).length, 0) + p.data.equips.filter((e) => (e.eng?.length ?? 0) >= 5).length,
    };
    const got = (p.data.titles ??= []);
    for (const t of TITLES) {
      if (got.includes(t.id) || !t.check(ctx)) continue;
      got.push(t.id);
      this.audio.play('stone');
      this.hud.toast(`:sparkle: 칭호 획득: 「${t.name}」 — ${Object.entries(t.bonus).map(([k, v]) => bonusText(k as BonusKey, v!)).join(', ')}`, 4500);
    }
    this.applyStats();
  }

  /** 발밑 오라 (주간 시련에서 달성한 등급) */
  private applyAura(): void {
    const g = this.progress.data.aura ?? -1;
    const top = this.progress.data.end?.trial?.topGrade ?? -1;
    if (!this.player) return;
    this.player.setAura(g >= 0 && g <= top ? g : -1, g >= 0 ? TRIAL_GRADES[g].color : 0);
  }

  /** 이번 주 시련 기록 (주가 바뀌었으면 지난 기록을 넘긴다) */
  private trialRecord(): TrialRecord {
    const e = this.progress.data.end!;
    const day = dayKey();
    e.trial = rollTrialWeek(e.trial ?? newTrial(day), day);
    return e.trial;
  }

  /** 일일 시련 시작: 내 능력치 그대로 오늘의 수호자에게 */
  private startTrial(): void {
    this.afterMenu = () => this.enterDungeon(1, 1, false, undefined, { kind: 'trial', week: dayKey(), hits: 0, potions: 0 });
    this.screens.close();
  }

  /** 증표 주기 (던전 안이면 가방이 아니라 바로 창고로) */
  private giveMarks(n: number, why: string): void {
    if (n <= 0) return;
    this.progress.add(MARK, n);
    this.audio.play('coin');
    this.hud.toast(`:sparkle: 영겁의 증표 +${n} — ${why}`, 3500);
  }

  /** 일일 시련 끝: 깎은 체력(또는 처치 시간)으로 기록한 뒤 마을로 (쓰러져도 짐은 그대로) */
  private finishTrial(killed: boolean): void {
    const run = this.run;
    if (!run || run.end?.kind !== 'trial') return;
    const end = run.end;
    const t = this.trialRecord();
    const lv = this.level;
    const boss = lv instanceof DungeonScene ? (lv.monsters.find((m) => m.isBoss) ?? lv.boss) : null;
    const ratio = boss ? 1 - Math.max(0, boss.hp) / boss.maxHp : 0;
    const secs = Math.min(TRIAL_TIME, this.bossTime);
    const score = trialScore(ratio, killed, secs);
    const grade = trialGrade(score);
    let best = '';
    // 다른 날 시작한 도전은 기록하지 않는다
    if (end.week === t.week && score > t.best) {
      if (t.best === 0) {
        t.weeks++;
        this.progress.achAdd('trialDays');
      }
      t.best = score;
      t.time = Math.round(secs);
      t.hits = end.hits;
      t.cls = this.progress.data.currentClass;
      best = ' · 오늘 최고 기록!';
      // 오늘 기록의 등급만큼 증표 (오르면 차액)
      const want = trialDayMarks(score);
      const got = t.marks ?? 0;
      if (want > got) {
        t.marks = want;
        window.setTimeout(() => this.giveMarks(want - got, '일일 차원 시련 기록'), 1500);
      }
      // 순위 이름이 있으면 시트에 바로 올린다
      const name = this.progress.data.nickname;
      if (name) {
        void submitTrial({ board: 'trial', week: t.week, name, cls: t.cls, level: this.progress.cls.level, score, seconds: t.time, boss: BOSS_SPECIES[trialSpec(t.week).tier - 1].name, version: GAME_VERSION }).then((r) =>
          this.hud.toast(r.ok ? ':sparkle: 순위표에 기록을 올렸습니다' : `순위표 올리기 실패: ${r.reason}`, 3000),
        );
      }
    }
    // 처음 오른 등급이면 그 오라를 얻고 바로 두른다
    if (grade > t.topGrade) {
      t.topGrade = grade;
      this.progress.data.aura = grade;
      window.setTimeout(() => this.hud.toast(`:sparkle: 새 발밑 오라: ${TRIAL_GRADES[grade].aura} (차원의 끝 → 시련에서 바꿀 수 있음)`, 4500), 2500);
    }
    run.pouch = [];
    this.mode = 'play';
    this.player.hp = Math.max(1, this.player.hp);
    this.hud.setBoss(null);
    this.checkTitles();
    const gname = grade >= 0 ? TRIAL_GRADES[grade].name : '등급 없음';
    const txt = `일일 시련 ${killed ? '처치!' : '종료'}: ${trialScoreText(score)} (${gname})`;
    this.hud.toast(`${txt}${best}`, 5000);
    this.finishRun(txt);
  }

  // ---------------- 주간 차원 레이드 (v10) ----------------
  private raidRecord(): RaidRecord {
    const e = this.progress.data.end!;
    const wk = weekKey();
    const r = (e.raid ??= newRaid(wk));
    if (r.week !== wk) Object.assign(r, { week: wk, best: 0, time: 0, cls: '' });
    const day = dayKey();
    if (r.day !== day) Object.assign(r, { day, dayBest: 0, dayMarks: 0 });
    return r;
  }

  private startRaid(): void {
    this.afterMenu = () => this.enterDungeon(1, 1, false, undefined, { kind: 'raid', week: weekKey(), hits: 0 });
    this.screens.close();
  }

  /** 레이드 끝: 처치했으면 시간, 아니면 깎은 체력으로 기록. 짐은 잃지 않는다 */
  private finishRaid(killed: boolean): void {
    const run = this.run;
    if (!run || run.end?.kind !== 'raid') return;
    const end = run.end;
    const r = this.raidRecord();
    const lv = this.level;
    const boss = lv instanceof DungeonScene ? (lv.monsters.find((m) => m.isBoss) ?? lv.boss) : null;
    const ratio = killed ? 1 : boss ? 1 - Math.max(0, boss.hp) / boss.maxHp : 0;
    const secs = Math.min(RAID_TIME, this.bossTime);
    const score = raidScore(ratio, killed, secs);
    let best = '';
    if (killed) {
      r.kills++;
      this.progress.achAdd('raids');
    }
    if (end.week === r.week && score > r.best) {
      r.best = score;
      r.time = Math.round(secs);
      r.cls = this.progress.data.currentClass;
      r.played = [r.week, ...(r.played ?? []).filter((w) => w !== r.week)].slice(0, 10);
      best = ' · 이번 주 최고 기록!';
      const name = this.progress.data.nickname;
      if (name)
        void submitTrial({ board: 'raid', week: r.week, name, cls: r.cls, level: this.progress.cls.level, score, seconds: r.time, boss: raidSpec(r.week).boss.name, version: GAME_VERSION }).then((x) =>
          this.hud.toast(x.ok ? ':sparkle: 레이드 순위표에 기록을 올렸습니다' : `순위표 올리기 실패: ${x.reason}`, 3000),
        );
    }
    // 하루 한 번: 오늘 가장 좋은 기록만큼 증표 (오르면 차액)
    if (score > (r.dayBest ?? 0)) {
      r.dayBest = score;
      const want = raidDayMarks(score);
      const got = r.dayMarks ?? 0;
      if (want > got) {
        r.dayMarks = want;
        window.setTimeout(() => this.giveMarks(want - got, '주간 차원 레이드 (오늘 기록)'), 1500);
      }
    }
    // 레이드 보스는 세트 장비를 떨어뜨리기도 한다 (처치했을 때)
    if (killed && Math.random() < 0.35) window.setTimeout(() => this.dropSetPiece('레이드 보스'), 2600);
    this.mode = 'play';
    this.player.hp = Math.max(1, this.player.hp);
    this.hud.setBoss(null);
    this.checkTitles();
    const txt = `주간 레이드 ${killed ? '처치!' : '종료'}: ${raidScoreText(score)}`;
    this.hud.toast(`${txt}${best}`, 5000);
    this.finishRun(txt);
  }

  /** 보스가 세트 설계도를 떨어뜨렸다 → 창고 (제작대 세트 탭에서 세트 장비로) */
  private dropSetPiece(from: string, n = 1): void {
    const p = this.progress;
    p.add(SET_TOKEN, n);
    this.audio.play('stone');
    this.hud.toast(`:sparkle: ${from}이(가) 세트 설계도 ${n}장을 떨어뜨렸다 (창고 · 차원집 제작대 → 세트)`, 4500);
    this.saveNow();
  }


  // ---------------- 8장 「갈라진 차원」 (v10) ----------------
  /** 거울 분신 (다시 분신이 되지 않게) */
  private mirrored = new WeakSet<Monster>();
  private ch8State: { t: number; meteorT: number; base: Map<Monster, number>; fast: boolean; level: DungeonScene | null } = { t: 0, meteorT: 5, base: new Map(), fast: false, level: null };

  /** 지금 8장 방에 이 규칙이 붙어 있는지 */
  private ch8Has(r: Ch8Rule): boolean {
    const e = this.run?.end;
    return e?.kind === 'ch8' && CH8_STAGES[e.stage - 1].rules.includes(r);
  }

  /** 8장 방에 들어왔을 때: 칠흑이면 빛을 줄이고 화면 가장자리를 어둡게 */
  private beginCh8(level: DungeonScene): void {
    this.ch8State = { t: 0, meteorT: 5, base: new Map(), fast: false, level };
    const dark = this.ch8Has('dark');
    if (dark) {
      if (level.hemi) level.hemi.intensity *= 0.3;
      level.sun.intensity *= 0.25;
    }
    document.body.classList.toggle('ch8-dark', dark);
  }

  private updateCh8(dt: number, level: DungeonScene): void {
    const st = this.ch8State;
    if (st.level !== level) this.beginCh8(level);
    st.t += dt;
    // 뒤틀린 시간: 12초마다 4초 동안 몬스터 가속
    if (this.ch8Has('time')) {
      const fast = st.t % 12 > 8;
      for (const m of level.monsters) {
        if (!m.alive) continue;
        if (!st.base.has(m)) st.base.set(m, m.speed);
        m.speed = st.base.get(m)! * (fast ? 1.6 : 1);
      }
      if (fast && !st.fast) {
        this.hud.toast(':hourglass: 시간이 뒤틀린다 — 몬스터가 빨라졌다!', 1500);
        level.effects.ring(this.player.position.x, this.player.position.z, 6, CH8_RULES.time.color, 0.6, 1.2);
      }
      st.fast = fast;
    }
    // 별똥비: 7초마다 내 주변 세 곳에 운석
    if (this.ch8Has('meteor') && level.monsters.some((m) => m.alive && m.aggro)) {
      st.meteorT -= dt;
      if (st.meteorT <= 0) {
        st.meteorT = 7;
        const p = this.player.position;
        const atk = Math.max(1, ...level.monsters.filter((m) => m.alive && !m.isBoss).map((m) => m.atk), 1);
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = i === 0 ? Math.random() * 1.5 : 2 + Math.random() * 4;
          const x = p.x + Math.cos(a) * r;
          const z = p.z + Math.sin(a) * r;
          level.effects.zone(x, z, 2, CH8_RULES.meteor.color, 1.3);
          level.effects.glyph(x, z, 2, CH8_RULES.meteor.color, 1.3);
          window.setTimeout(() => {
            if (this.level !== level || !this.player.alive) return;
            level.effects.explosion(x, z, 2.2, 0xff6a4a);
            level.particles.burst(x, 0.6, z, 0x5a3a2a, 14, 1.5);
            this.audio.play('boom');
            this.shakeT = Math.max(this.shakeT, 0.25);
            const q = this.player.position;
            if (Math.hypot(q.x - x, q.z - z) < 2.2) this.hurtPlayer(atk * 1.3, x, z);
            for (const m of level.monsters) if (m.targetable && Math.hypot(m.x - x, m.z - z) < 2.2 + m.radius) m.damage(m.maxHp * 0.05, x, z, 1);
          }, 1300);
        }
      }
    }
  }

  /** 8-10 수문장을 처음 쓰러뜨렸다: 차원 소환사 합류 */
  private ch8Finale(): void {
    const p = this.progress;
    if (p.data.unlockedClasses.includes('summoner')) return;
    this.openMenu(
      () =>
        this.screens.ask(
          '포탈이 부서지며 누군가 걸어 나온다…',
          '수문장이 지키던 포탈 속에 갇혀 있던 사람이 풀려났습니다. 마을로 돌아가 ???와 이야기해 보세요.',
          () => this.screens.close(),
          () => this.screens.close(),
        ),
      () => this.resume(),
    );
    p.setFlag('ch8Boss');
    this.saveNow();
  }

  // ---------------- 무한 러쉬 (v10) ----------------
  /** 러쉬 한 판의 상태: 축복, 다음 축복까지 처치 수, 소환 타이머, 칼날 궤도 */
  private horde: {
    stacks: Partial<Record<BlessId, number>>;
    next: number;
    spawnAcc: number;
    bossT: number;
    bossN: number;
    thunderT: number;
    blades: Mesh[];
    bladeCd: Map<Monster, number>;
    angle: number;
    label: number;
  } | null = null;

  private startHorde(): void {
    this.afterMenu = () => this.enterDungeon(1, 1, false, undefined, { kind: 'horde', kills: 0, time: 0, bossesDown: 0, picks: 0 });
    this.screens.close();
  }

  private hordeRecord() {
    return (this.progress.data.end!.horde ??= newHorde());
  }

  /** 러쉬를 시작할 때 (enterDungeon 뒤) */
  private beginHorde(): void {
    this.clearHorde();
    this.horde = { stacks: {}, next: blessNeed(0), spawnAcc: 4, bossT: HORDE_BOSS_EVERY, bossN: 0, thunderT: 2, blades: [], bladeCd: new Map(), angle: 0, label: 0 };
    this.applyStats();
  }

  private clearHorde(): void {
    if (!this.horde) return;
    for (const b of this.horde.blades) {
      b.parent?.remove(b);
      b.geometry.dispose();
      (b.material as MeshBasicMaterial).dispose();
    }
    this.horde = null;
  }

  /** 플레이어 둘레(화면 밖)의 바닥 한 곳 */
  private hordeSpot(level: DungeonScene, min: number, max: number): { x: number; z: number } | null {
    const p = this.player.position;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = min + Math.random() * (max - min);
      const x = p.x + Math.cos(a) * r;
      const z = p.z + Math.sin(a) * r;
      if (isFloor(level.grid, Math.floor(x / TILE), Math.floor(z / TILE)) && isFloor(level.grid, Math.floor(x / TILE) + 1, Math.floor(z / TILE))) return { x, z };
    }
    return null;
  }

  private updateHorde(dt: number, level: DungeonScene, end: Extract<EndRun, { kind: 'horde' }>): void {
    const h = this.horde;
    if (!h) return;
    end.time += dt;
    h.label -= dt;
    if (h.label <= 0) {
      h.label = 0.5;
      this.hud.setLocation(this.endLabel(end, level.theme.name), level.theme.portalColor);
    }
    const mult = hordeMult(end.time);
    // 차원의 틈에서 몬스터가 쏟아진다
    h.spawnAcc += dt * hordeRate(end.time);
    const alive = level.monsters.filter((m) => m.alive).length;
    while (h.spawnAcc >= 1) {
      h.spawnAcc -= 1;
      if (alive >= HORDE_MAX_ALIVE) continue;
      const spot = this.hordeSpot(level, 12, 17);
      if (!spot) continue;
      level.mods.hp = level.mods.atk = mult;
      const elite = Math.random() < Math.min(0.2, 0.03 + end.time / 1500);
      const sp = pickSpecies(7, Math.random, elite ? (d) => d.arch !== 'swarm' : undefined, undefined, HORDE_POOL);
      const n = !elite && sp.pack ? sp.pack : 1;
      for (let i = 0; i < n; i++) level.spawnMonster(sp, elite ? 'elite' : 'normal', spot.x + (i ? (Math.random() - 0.5) * 1.6 : 0), spot.z + (i ? (Math.random() - 0.5) * 1.6 : 0), 0, true);
      level.effects.glyph(spot.x, spot.z, 1.1, 0xb67cff, 0.5);
    }
    // 1분 30초마다 보스 (파수꾼 → 수호자 번갈아)
    h.bossT -= dt;
    if (h.bossT <= 0) {
      h.bossT = HORDE_BOSS_EVERY;
      const spot = this.hordeSpot(level, 9, 13);
      if (spot) {
        h.bossN++;
        level.mods.hp = mult * 0.3;
        level.mods.atk = mult * 0.8;
        const kind = h.bossN % 2 ? 'midboss' : 'boss';
        const m = level.spawnBoss(kind, 1 + Math.floor(Math.random() * 7), spot.x, spot.z);
        m.aggro = true;
        if (!level.boss || !level.boss.alive) level.boss = m;
        level.effects.pillar(m.x, m.z, 0xff4a6a, 6);
        this.hud.toast(`:warning: 차원의 틈에서 ${m.name}이(가) 나타났다!`, 2500);
        this.audio.play('stone');
      }
    }
    const p = this.player.position;
    // 칼날 궤도
    const nBlade = h.stacks.orbit ?? 0;
    while (h.blades.length < nBlade) {
      const b = new Mesh(new BoxGeometry(0.22, 0.12, 1.1), new MeshBasicMaterial({ color: BLESSINGS.orbit.color, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
      level.scene.add(b);
      h.blades.push(b);
    }
    h.angle += dt * 3.2;
    for (const [m, t] of h.bladeCd) h.bladeCd.set(m, t - dt);
    h.blades.forEach((b, i) => {
      const a = h.angle + (i / h.blades.length) * Math.PI * 2;
      const x = p.x + Math.cos(a) * 2.4;
      const z = p.z + Math.sin(a) * 2.4;
      b.position.set(x, 0.9, z);
      b.rotation.y = -a;
      for (const m of level.monsters) {
        if (!m.targetable || Math.hypot(m.x - x, m.z - z) > m.radius + 0.7 || (h.bladeCd.get(m) ?? 0) > 0) continue;
        h.bladeCd.set(m, 0.4);
        this.damageMonster(m, 0.7, 0.4, p.x, p.z);
      }
    });
    // 천둥: 2초마다 가까운 적에게 번개
    const nThunder = h.stacks.thunder ?? 0;
    if (nThunder) {
      h.thunderT -= dt;
      if (h.thunderT <= 0) {
        h.thunderT = 2;
        const near = level.monsters.filter((m) => m.targetable && Math.hypot(m.x - p.x, m.z - p.z) < 10).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        for (const m of near.slice(0, nThunder)) {
          level.effects.bolt(m.x, m.z - 0.01, m.x, m.z, 0xfff08a);
          level.effects.ring(m.x, m.z, 1.2, 0xfff08a, 0.3);
          this.damageMonster(m, 1.8, 0.5, m.x, m.z);
        }
        if (near.length) this.audio.play('zap');
      }
    }
  }

  /** 러쉬에서 몬스터를 쓰러뜨렸을 때: 처치 수, 폭발 축복, 다음 축복 */
  private hordeKill(m: Monster, end: Extract<EndRun, { kind: 'horde' }>): void {
    const h = this.horde;
    if (!h) return;
    end.kills += m.isBoss ? 10 : 1;
    if (m.isBoss) {
      end.bossesDown++;
      this.hud.setBoss(null);
    }
    const nNova = h.stacks.nova ?? 0;
    const level = this.level;
    if (nNova && level instanceof DungeonScene) {
      level.effects.explosion(m.x, m.z, 2.2, BLESSINGS.nova.color);
      for (const o of level.monsters) if (o !== m && o.targetable && Math.hypot(o.x - m.x, o.z - m.z) < 2.2 + o.radius) this.damageMonster(o, 0.5 * nNova, 0.6, m.x, m.z);
    }
    if (end.kills >= h.next) {
      end.picks++;
      h.next = end.kills + blessNeed(end.picks);
      window.setTimeout(() => this.offerBlessing(), 50);
    }
  }

  /** 축복 셋 중 하나 고르기 (고르는 동안 멈춘다) */
  private offerBlessing(): void {
    const h = this.horde;
    if (!h || this.mode !== 'play') {
      // 다른 창이 열려 있으면 조금 뒤에
      if (h) window.setTimeout(() => this.offerBlessing(), 400);
      return;
    }
    const pool = BLESS_IDS.filter((id) => (h.stacks[id] ?? 0) < BLESSINGS[id].max);
    const picks: BlessId[] = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    this.audio.play('level');
    this.openMenu(() =>
      this.screens.blessPick(
        picks.map((id) => ({ id, name: BLESSINGS[id].name, text: BLESSINGS[id].text, color: BLESSINGS[id].color, lv: h.stacks[id] ?? 0, max: BLESSINGS[id].max })),
        (id: string | null) => {
          const pl = this.player;
          if (id) {
            h.stacks[id as BlessId] = (h.stacks[id as BlessId] ?? 0) + 1;
            this.applyStats();
            if (id === 'vital') pl.hp = pl.maxHp;
          } else pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.5);
          this.screens.close();
        },
        () => this.resume(),
      ),
    );
  }

  /** 러쉬 끝 (쓰러지거나 포기): 기록 · 첫 달성 보상 · 골드. 짐은 잃지 않는다 */
  private finishHorde(): void {
    const run = this.run;
    if (!run || run.end?.kind !== 'horde') return;
    const end = run.end;
    const rec = this.hordeRecord();
    let best = '';
    if (end.kills > rec.best) {
      rec.best = end.kills;
      rec.bestTime = Math.round(end.time);
      best = ' · 최고 기록!';
    }
    const day = dayKey();
    if (rec.day !== day) Object.assign(rec, { day, dayBest: 0 });
    if (end.kills > (rec.dayBest ?? 0)) {
      rec.dayBest = end.kills;
      const name = this.progress.data.nickname;
      if (name && end.kills > 0)
        void submitTrial({ board: 'horde', week: day, name, cls: this.progress.data.currentClass, level: this.progress.cls.level, score: end.kills, seconds: Math.min(36000, Math.round(end.time)), boss: '', version: GAME_VERSION }).then((x) =>
          this.hud.toast(x.ok ? ':sparkle: 러쉬 순위표에 기록을 올렸습니다' : `순위표 올리기 실패: ${x.reason}`, 3000),
        );
    }
    // 처치 수 첫 달성 보상
    let marks = 0;
    while (rec.claimed < HORDE_MILESTONES.length && rec.best >= HORDE_MILESTONES[rec.claimed].kills) marks += HORDE_MILESTONES[rec.claimed++].marks;
    if (marks) window.setTimeout(() => this.giveMarks(marks, '무한 러쉬 첫 달성 보상'), 1500);
    const gold = Math.round(end.kills * 40 * (1 + this.progress.bonus('gold')));
    this.progress.data.gold += gold;
    run.gold += gold;
    this.clearHorde();
    this.mode = 'play';
    this.player.hp = Math.max(1, this.player.hp);
    this.hud.setBoss(null);
    this.applyStats();
    this.checkTitles();
    const txt = `무한 러쉬: ${end.kills}마리 처치 · ${formatClock(end.time)} 버팀 · +${gold.toLocaleString()} G`;
    this.hud.toast(`${txt}${best}`, 5000);
    this.finishRun(txt);
  }

  /** 지난 시련(어제)·레이드(지난주) 순위를 확인해 순위 보상을 준다 (시트에서 받아 온다) */
  private rankChecking = false;
  private checkRankRewards(): void {
    const e = this.progress.data.end;
    if (!e || this.rankChecking || !this.progress.data.nickname) return;
    const t = e.trial;
    const yday = prevDayKey();
    const trialTodo = t && (t.history.some((h) => h.week === yday) || (t.week === yday && t.best > 0)) && !(t.rankDone ?? []).includes(yday);
    const r = e.raid;
    const lastWk = prevWeekKey();
    const raidTodo = r && (r.played ?? []).includes(lastWk) && !(r.rankDone ?? []).includes(lastWk);
    if (!trialTodo && !raidTodo) return;
    this.rankChecking = true;
    const jobs: Promise<void>[] = [];
    if (trialTodo && t)
      jobs.push(
        myRank('trial', yday).then((x) => {
          if (!x.ok) return;
          t.rankDone = [yday, ...(t.rankDone ?? [])].slice(0, 20);
          const m = rankMarks(x.rank, x.total);
          if (m) this.giveMarks(m, `어제 일일 시련 ${x.rank}위 (${x.total}명)`);
        }),
      );
    if (raidTodo && r)
      jobs.push(
        myRank('raid', lastWk).then((x) => {
          if (!x.ok) return;
          r.rankDone = [lastWk, ...(r.rankDone ?? [])].slice(0, 20);
          const m = rankMarks(x.rank, x.total, true);
          if (m) this.giveMarks(m, `지난주 레이드 ${x.rank}위 (${x.total}명)`);
        }),
      );
    void Promise.all(jobs).finally(() => {
      this.rankChecking = false;
      this.saveNow();
    });
  }

  /** 엔드 콘텐츠의 방을 다 정리했을 때: 기록과 보상 */
  private endRoomClear(end: EndRun): string {
    const p = this.progress;
    const e = p.data.end!;
    const give = (gold: number, dust: number) => {
      p.data.gold += gold;
      this.run!.gold += gold;
      if (dust) {
        const added = this.run!.bag.add(DUST, dust);
        if (added < dust) p.depositItem(DUST, dust - added);
      }
      return `+${gold} G${dust ? ` · 차원 가루 ${dust}개` : ''}`;
    };
    if (end.kind === 'ch8') {
      const c8 = (p.data.ch8 ??= { cleared: 0 });
      const first = end.stage > c8.cleared;
      if (first) c8.cleared = end.stage;
      if (end.stage === 10 && first) window.setTimeout(() => this.ch8Finale(), 600);
      this.checkTitles();
      return `8-${end.stage} ${CH8_STAGES[end.stage - 1].name} 돌파!${first && end.stage < 10 ? ` 8-${end.stage + 1} 열림` : ''}`;
    }
    if (end.kind === 'tower') {
      if (end.floor > e.towerBest) {
        e.towerBest = end.floor;
        const r = towerFirstClear(end.floor);
        this.checkTitles();
        return `${end.floor}층 첫 돌파! ${give(r.gold, r.dust)}`;
      }
      return `${end.floor}층 돌파`;
    }
    if (end.kind === 'rush') {
      if (end.index < rushFights(end.diff).length - 1) return `${end.index + 1}/${rushFights(end.diff).length} 격파 (경과 ${formatClock(this.run!.time)})`;
      const secs = this.run!.time;
      const grade = rushGrade(secs);
      const r = rushReward(end.diff, grade);
      const order = 'SABC';
      if (!e.rushBest[end.diff] || secs < e.rushBest[end.diff]) e.rushBest[end.diff] = Math.round(secs);
      if (!e.rushGradeBest[end.diff] || order.indexOf(grade) < order.indexOf(e.rushGradeBest[end.diff])) e.rushGradeBest[end.diff] = grade;
      this.checkTitles();
      return `보스 러시 ${RUSH_DIFFS[end.diff].name} 완주! ${formatClock(secs)} · ${grade}등급 ${give(r.gold, r.dust)}`;
    }
    if (end.kind !== 'rift') return '';
    const inTime = end.timeLeft > 0;
    const r0 = riftReward(end.level, inTime);
    // 균열 서약: 건 서약만큼 보상 증가
    const vm = vowMult(end.vows);
    const r = { gold: Math.round(r0.gold * vm), dust: Math.floor(r0.dust * vm) };
    if (inTime && end.level > e.riftBest) e.riftBest = end.level;
    this.checkTitles();
    return `심연 균열 ${end.level}단계 ${inTime ? '돌파' : '정리 (시간 초과: 보상 절반)'} ${give(r.gold, r.dust)}${inTime && end.level === e.riftBest ? ` · ${end.level + 1}단계 열림` : ''}`;
  }

  /** 엔딩 후: 회차 대신 '차원의 끝'이 열린다. 레벨·장비·차원석·스테이지는 모두 그대로 */
  private openEndgame(): void {
    const p = this.progress;
    p.take('resonator', 1);
    p.setFlag('endgame');
    this.saveNow();
    this.mode = 'dialogue';
    this.enterVillage('start');
    this.playScript('endgame');
  }

  // =============== 전투 ===============
  private damageMonster(m: Monster, mult: number, knock: number, fx: number, fz: number): void {
    if (!m.alive) return;
    this.player.inCombat();
    if (m.isDown) return;
    // 망령: 공격의 30%를 흘려 피한다
    if (m.species.trait === 'evasive' && Math.random() < 0.3) {
      const s = this.toScreen(m.x, m.rig.height * m.rig.root.scale.y + 0.3, m.z);
      this.hud.floatText(s.x, s.y, '회피', '#c8d0ff', 'small');
      this.level.effects.sparks(m.x, 1.2, m.z, 0xc8d0ff, 5, { up: true, spread: 0.4 });
      return;
    }
    if (m.shielded) {
      m.damage(0, fx, fz, 0);
      const s = this.toScreen(m.x, m.rig.height * m.rig.root.scale.y + 0.3, m.z);
      this.hud.floatText(s.x, s.y, '보호막', '#7fd6ff', 'small');
      return;
    }
    const st = this.buffedStats();
    const sp = this.specialTotals();
    const crit = Math.random() * 100 < st.crit;
    // 특수 옵션: 치명타 피해 · 보스 피해 · 마무리(체력 30% 이하)
    let spMult = 1;
    if (sp.bossDmg && (m.kind === 'boss' || m.kind === 'midboss')) spMult *= 1 + sp.bossDmg / 100;
    if (sp.execute && m.hp < m.maxHp * 0.3) spMult *= 1 + sp.execute / 100;
    // 사냥 표적: 표식이 남은 적은 +40%
    if (m.marked > 0) spMult *= 1.4;
    // 그림자 일격 (회피 뒤 3초)
    if (sp.dodgeBuff && this.player.buff('dodgebuff')) spMult *= 1 + sp.dodgeBuff / 100;
    // 약점 포착: 치명타 피해 +50%
    const critMul = 1.6 + (sp.critDmg ?? 0) / 100 + (this.player.buff('hunt2') ? 0.5 : 0);
    const raw = st.atk * mult * spMult * (0.9 + Math.random() * 0.2) * (crit ? critMul : 1);
    const dmg = Math.max(1, Math.round(raw * (40 / (40 + m.defense))));
    let killed = m.damage(dmg, fx, fz, knock * (this.ch8Has('drift') ? 2 : 1));
    const s = this.toScreen(m.x, m.rig.height * m.rig.root.scale.y + 0.3, m.z);
    // 숫자는 공격한 쪽의 반대로 밀려난다
    const from = this.toScreen(fx, m.rig.height * m.rig.root.scale.y + 0.3, fz);
    const away = { x: s.x - from.x, y: s.y - from.y };
    this.hud.floatText(s.x, s.y, String(dmg), crit ? '#ffd23a' : '#ffffff', crit ? 'crit' : 'normal', away);
    this.level.particles.burst(m.x, 0.8, m.z, 0xffffff, crit ? 8 : 4, 0.8);
    this.audio.play(crit ? 'crit' : 'hit');
    if (!this.progress.trial) killed = this.onHitSpecials(m, dmg, sp, s, killed, fx, fz);
    if (killed) this.monsterKilled(m);
  }

  /** 특수 옵션: 적중 시 효과. 추가 타격으로 쓰러뜨리면 true */
  private onHitSpecials(m: Monster, dmg: number, sp: SpecialTotals, s: { x: number; y: number }, killed: boolean, fx: number, fz: number): boolean {
    const pl = this.player;
    const chance = (v?: number) => !!v && Math.random() * 100 < v;
    if (sp.lifesteal && pl.hp < pl.maxHp) pl.hp = Math.min(pl.maxHp, pl.hp + Math.min(dmg * sp.lifesteal / 100, pl.maxHp * 0.03));
    // 피의 함성: 준 피해의 4% 흡수 (한 번에 최대 HP의 3%까지)
    if (pl.buff('bloodcry') && pl.hp < pl.maxHp) pl.hp = Math.min(pl.maxHp, pl.hp + Math.min(dmg * 0.04, pl.maxHp * 0.03));
    if (sp.mpOnHit) pl.mp = Math.min(pl.maxMp, pl.mp + pl.maxMp * sp.mpOnHit / 100);
    if (chance(sp.cdOnHit)) {
      const cds = this.combat.cooldowns;
      for (let i = 0; i < cds.length; i++) cds[i] = Math.max(0, cds[i] - 0.6);
    }
    if (chance(sp.hasteOnHit) && !pl.buff('haste')) pl.addBuff('haste', '신속', 4);
    if (chance(sp.swiftOnHit) && !pl.buff('swift')) pl.addBuff('swift', '질풍', 3);
    if (!killed && m.alive && chance(sp.double)) {
      killed = m.damage(dmg, fx, fz, 0);
      this.hud.floatText(s.x + 18, s.y - 14, `연타 ${dmg}`, '#ffe9a0', 'small');
    }
    if (!killed && m.alive && chance(sp.arcBurst)) {
      const extra = Math.max(1, Math.round(dmg * 0.6));
      killed = m.damage(extra, fx, fz, 0);
      this.hud.floatText(s.x - 18, s.y - 14, `폭발 ${extra}`, '#c89aff', 'small');
      this.level.effects.ring(m.x, m.z, 1.2, 0xc89aff, 0.3);
    }
    return killed;
  }

  /** 플레이어가 맞는다. 실제로 들어간 피해를 돌려준다. dot: 독 웅덩이처럼 무적 시간 없이 조금씩 */
  /** 방어 기준값: 지금 던전의 (능력치) 단계 */
  private defK(): number {
    const lv = this.level;
    return playerDefK(lv instanceof DungeonScene ? (lv.mods.statTier ?? lv.grid.tier) : 1);
  }

  private hurtPlayer(dmg: number, fx: number, fz: number, debuff?: DebuffSpec, dot = false): number {
    const pl = this.player;
    if (this.mode !== 'play' || !pl.alive) return 0;
    if (dot) {
      const d = Math.max(1, Math.round(dmg * (this.defK() / (this.defK() + this.buffedStats().def))));
      pl.inCombat();
      pl.hurtDot(d);
      const s = this.toScreen(pl.position.x, 2, pl.position.z);
      this.hud.floatText(s.x, s.y, `-${d}`, '#b8ff6a', 'small');
      if (debuff && Math.random() < debuff.chance) this.applyDebuff(debuff, dmg);
      this.checkPlayerDeath();
      return d;
    }
    if (pl.isInvulnerable) return 0;
    pl.inCombat();
    if (this.run?.end?.kind === 'raid') this.run.end.hits++;
    if (this.run?.end?.kind === 'trial') {
      this.run.end.hits++;
      if (this.level instanceof DungeonScene) this.hud.setLocation(this.endLabel(this.run.end, this.level.theme.name), this.level.theme.portalColor);
    }
    const st = this.buffedStats();
    const head = this.toScreen(pl.position.x, 2, pl.position.z);
    // 수호의 방패: 공격을 통째로 막는다
    const block = pl.buff('block');
    if (block && block.stacks) {
      block.stacks--;
      pl.invulnFor(0.3);
      // 반격 방패: 막을 때마다 주변을 벤다
      if (pl.buff('counter')) this.combat.counter();
      this.hud.floatText(head.x, head.y, '막음!', '#ffe07a', 'small');
      this.level.effects.ring(pl.position.x, pl.position.z, 1.4, 0xffe07a, 0.3);
      this.audio.play('hit');
      return 0;
    }
    // 바람 걸음: 확률 회피
    if (pl.buff('windwalk') && Math.random() < 0.3) {
      pl.invulnFor(0.3);
      this.hud.floatText(head.x, head.y, '회피', '#c8ffb0', 'small');
      return 0;
    }
    // 특수 옵션: 흘려 피하기 · 받는 피해 감소 · 위기 때 피해 감소
    const hsp = this.specialTotals();
    if (hsp.dodge && Math.random() * 100 < hsp.dodge) {
      pl.invulnFor(0.2);
      this.hud.floatText(head.x, head.y, '회피', '#c8ffb0', 'small');
      return 0;
    }
    let final = Math.max(1, Math.round(dmg * (0.9 + Math.random() * 0.2) * (this.defK() / (this.defK() + st.def))));
    if (hsp.dmgReduce) final = Math.max(1, Math.round(final * (1 - hsp.dmgReduce / 100)));
    if (hsp.lowGuard && pl.hp < pl.maxHp * 0.35) final = Math.max(1, Math.round(final * (1 - hsp.lowGuard / 100)));
    if (pl.buff('ironwall')) final = Math.max(1, Math.round(final * 0.6));
    if (pl.buff('smoke')) final = Math.max(1, Math.round(final * 0.5));
    // 차원 소환사: 차원 보호막 -50% · 영혼 결속 -25%
    if (pl.buff('riftward')) final = Math.max(1, Math.round(final * 0.5));
    if (pl.buff('bond')) final = Math.max(1, Math.round(final * 0.75));
    // 마나 실드: 피해의 60%를 MP로 받는다 (MP가 모자라면 남은 만큼만)
    if (pl.buff('manashield')) {
      const absorb = Math.min(Math.round(final * 0.6), Math.floor(pl.mp));
      pl.mp -= absorb;
      final -= absorb;
      if (absorb > 0) this.hud.floatText(head.x + 24, head.y, `-${absorb} MP`, '#7fb4ff', 'small');
      if (final <= 0) {
        pl.invulnFor(0.3);
        if (pl.buff('manareflect')) this.combat.manaZap();
        return 0;
      }
    }
    // 불굴: 쓰러질 피해를 한 번 버티고 HP 30% 회복
    const undying = pl.buff('undying');
    if (undying && final >= pl.hp) {
      final = Math.max(0, Math.floor(pl.hp) - 1);
      undying.t = 0;
      pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.3);
      pl.invulnFor(1);
      this.hud.floatText(head.x, head.y - 20, '불굴!', '#ffd84a', 'crit');
      this.level.effects.pillar(pl.position.x, pl.position.z, 0xffd84a, 3);
    }
    pl.hurt(final);
    this.gathering = null;
    // 가시 갑옷 · 반사 실드: 맞으면 되돌려 준다
    if (pl.buff('thorns')) this.combat.thorns();
    if (pl.buff('manareflect')) this.combat.manaZap();
    if (hsp.hitHeal && pl.hp > 0 && Math.random() * 100 < hsp.hitHeal) {
      pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.04);
      this.hud.floatText(head.x - 24, head.y, '회복', '#8aff9a', 'small');
    }
    // 맞을 때마다 가끔 방어구 하나가 닳는다
    if (Math.random() < 0.25) {
      const armor = (['helmet', 'armor', 'pants', 'boots'] as const).map((k) => this.progress.cls.equipment[k]).filter((e): e is Equip => !!e && durability(e) > 0);
      if (armor.length) this.wearEquip(armor[Math.floor(Math.random() * armor.length)]);
    }
    const s = this.toScreen(pl.position.x, 2, pl.position.z);
    const hitFrom = this.toScreen(fx, 2, fz);
    this.hud.floatText(s.x, s.y, `-${final}`, '#ff5a5a', 'hurt', { x: s.x - hitFrom.x, y: s.y - hitFrom.y });
    this.shakeT = Math.max(this.shakeT, 0.25);
    this.audio.play('hurt');
    const lv = this.level;
    const d = Math.hypot(pl.position.x - fx, pl.position.z - fz) || 1;
    moveWithCollision(lv.grid, pl.position, ((pl.position.x - fx) / d) * 0.5, ((pl.position.z - fz) / d) * 0.5, PLAYER.radius, lv.obstacles);
    if (debuff && Math.random() < debuff.chance) this.applyDebuff(debuff, dmg);
    this.checkPlayerDeath();
    return final;
  }

  private checkPlayerDeath(): void {
    if (!this.player.alive && this.mode === 'play') {
      this.mode = 'dead';
      this.deadTimer = 0;
      this.hud.setVisible(false);
      this.audio.play('fall');
    }
  }

  /** 몬스터가 건 약화 효과. 중독·화상은 맞은 공격력에 비례해 초마다 피해 */
  private applyDebuff(spec: DebuffSpec, dmg: number): void {
    const pl = this.player;
    const info = DEBUFF_INFO[spec.id];
    const dps = spec.id === 'poison' ? dmg * 0.12 : spec.id === 'burn' ? dmg * 0.22 : undefined;
    const had = !!pl.buff(spec.id);
    pl.addDebuff(spec.id, info.name, spec.duration, dps);
    if (!had) {
      const s = this.toScreen(pl.position.x, 2.4, pl.position.z);
      this.hud.floatText(s.x, s.y, info.name, `#${info.color.toString(16).padStart(6, '0')}`, 'small');
      this.level.effects.ring(pl.position.x, pl.position.z, 1.2, info.color, 0.3, 0.5);
    }
  }

  /** 약화 효과: 지속 피해와 몸에서 피어오르는 색 입자 */
  private updateDebuffs(dt: number): void {
    const pl = this.player;
    if (!pl.alive) return;
    for (const b of pl.buffs) {
      if (!b.bad) continue;
      const info = DEBUFF_INFO[b.id as DebuffId];
      if (Math.random() < dt * 6) this.level.effects.sparks(pl.position.x, 0.6 + Math.random() * 0.8, pl.position.z, info.color, 1, { up: true, spread: 0.35, life: 0.6 });
      if (!b.dps) continue;
      b.tick = (b.tick ?? 1) - dt;
      if (b.tick <= 0) {
        b.tick = 1;
        const d = Math.max(1, Math.round(b.dps));
        pl.hurtDot(d);
        const s = this.toScreen(pl.position.x, 2, pl.position.z);
        this.hud.floatText(s.x, s.y, `-${d}`, `#${info.color.toString(16).padStart(6, '0')}`, 'small');
        this.checkPlayerDeath();
      }
    }
  }

  /** 장비 내구도 1 감소. 망가지면 능력치가 사라진다 */
  private wearEquip(e: Equip): void {
    e.dur = Math.max(0, durability(e) - 1);
    if (e.dur === 0) {
      this.applyStats();
      this.hud.toast(`${equipName(e)}이(가) 망가졌습니다! 대장장이 고른에게 수리하세요`, 3000);
    } else if (e.dur === 20) this.hud.toast(`${equipName(e)} 내구도 20 — 수리가 필요합니다`, 2000);
  }

  private gainExp(n: number): void {
    const ups = this.progress.addExp(n);
    if (this.progress.transcendUps > 0) {
      this.level.effects.pillar(this.player.position.x, this.player.position.z, 0x5ef0ff);
      this.audio.play('level');
      this.hud.toast(`:sparkle: 초월 Lv.${this.progress.cls.tlv}! 초월 포인트 +${this.progress.transcendUps} (캐릭터 → 능력치)`, 3000);
      this.checkTitles();
    }
    if (ups > 0) {
      // 레벨이 올라 새 궁극기가 열렸는지
      const p = this.progress;
      const before = p.cls.level - ups;
      for (const [i, u] of ULTIMATES[p.data.currentClass].entries()) {
        if (before < u.level && p.cls.level >= u.level && p.data.dimStones.includes(u.stone)) {
          p.cls.ult = i;
          window.setTimeout(() => this.hud.toast(`:sparkle: 궁극기 해금! ${u.name}`, 4000), 1500);
        }
      }
      this.applyStats();
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.level.effects.pillar(this.player.position.x, this.player.position.z, 0xffe07a);
      this.audio.play('level');
      this.hud.toast(`레벨 업! Lv.${this.progress.cls.level} · 스탯 포인트 +${ups * 5} (캐릭터 → 능력치)`, 3000);
    }
  }

  private monsterKilled(m: Monster): void {
    // 특수 옵션: 처치 시 회복
    const ksp = this.specialTotals();
    if (ksp.killHeal) this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * ksp.killHeal / 100);
    if (ksp.killMp) this.player.mp = Math.min(this.player.maxMp, this.player.mp + this.player.maxMp * ksp.killMp / 100);
    const run = this.run;
    if (!run || !(this.level instanceof DungeonScene)) return;
    // 엔드 콘텐츠는 7단계 전리품 (균열은 맵의 자원만 그 단계)
    const tier = run.end ? 7 : run.tier;
    const rng = new Rng(randomSeed());
    this.audio.play('kill');
    this.level.particles.burst(m.x, 0.7, m.z, 0xffffff, 12, 1.2);
    this.quests.event({ type: 'kill', tier, elite: m.kind === 'elite', species: m.species.id });
    this.progress.achAdd('kills');
    if (m.kind === 'elite') this.progress.achAdd('elites');
    if (m.isBoss) this.progress.achAdd('bosses');
    // 몬스터 도감: 처음 잡은 종족은 알린다
    if (this.progress.recordKill(m.species.id)) {
      const name = m.species.id === 'slime_small' ? '슬라임' : m.species.name;
      this.hud.toast(this.quests.isDone('m_research') ? `도감에 새 몬스터 등록: ${name} — 연구자 노아에게 보상을 받자` : `새 몬스터 발견: ${name}`, 2600);
    }

    // 무한 러쉬: 전리품 없이 처치 수 · 경험치 절반 (보상은 끝날 때 한꺼번에)
    if (run.end?.kind === 'horde') {
      const hexp = Math.max(1, Math.round(m.exp * 0.5));
      run.exp += hexp;
      this.gainExp(hexp);
      this.hordeKill(m, run.end);
      this.refreshHud();
      return;
    }
    // 레이드: 전리품 없음. 레이드 보스를 쓰러뜨리면 바로 기록
    if (run.end?.kind === 'raid') {
      if (m.isBoss && !run.roomCleared) {
        run.roomCleared = true;
        this.hud.setBoss(null);
        window.setTimeout(() => this.finishRaid(true), 900);
      }
      this.refreshHud();
      return;
    }
    // 일일 시련: 전리품·경험치 없음 (수호자를 쓰러뜨리면 방 정리로 기록)
    if (run.end?.kind === 'trial') {
      if (m.isBoss) {
        this.hud.setBoss(null);
        this.audio.playMusic('dungeon');
      }
      this.refreshHud();
      return;
    }

    const weapon = this.progress.cls.equipment.weapon;
    if (weapon && durability(weapon) > 0 && Math.random() < 0.12) this.wearEquip(weapon);

    // 레벨에 비해 낮은 단계에서는 경험치가 줄어든다 (엔드 콘텐츠는 그대로)
    const exp = Math.max(1, Math.round(m.exp * (run.end ? 1 : lowStageExpMult(this.progress.cls.level, run.tier))));
    run.exp += exp;
    this.gainExp(exp);

    const bossMult = m.kind === 'boss' ? 25 : m.kind === 'midboss' ? 10 : m.kind === 'elite' ? 4 : 1;
    // 몬스터 골드 (v9.2: +40%). 황금 보고를 지키는 몬스터는 두 배
    const vault = run.farm === 'gold' ? 2 : 1;
    const gold = Math.max(1, Math.round((m.kind === 'normal' ? rng.range(0.6, 1.6) : rng.int(2, 5)) * 1.4 * vault * (run.end?.kind === 'ch8' ? goldScale(7, 10) * (1.2 + run.stage * 0.05) : run.end ? tier * (1 + (run.stage - 1) * 0.15) : goldScale(tier, run.stage)) * bossMult * (1 + this.progress.bonus('gold'))));
    run.gold += gold;
    this.progress.data.gold += gold;

    const s = this.toScreen(m.x, 1.8, m.z);
    let line = 0;
    // 획득 로그: 처치 하나당 한 줄로 모아서 남긴다
    const parts: string[] = [`<b>${m.name}</b>`, `경험치 +${exp}`];
    queueMicrotask(() => this.hud.log(parts.join(' · ')));
    const loot = (text: string, color: string) => {
      this.hud.floatText(s.x, s.y - 22 * line++, text, color, 'small');
      parts.push(`<span style="color:${color}">${text.replace(/^\+/, '')}</span>`);
    };
    loot(`+${gold} G`, '#ffd23a');
    // 보스 러시: 보상은 완주했을 때 한꺼번에 (보스 전리품 없음)
    if (run.end?.kind === 'rush') {
      if (m.isBoss) {
        this.hud.setBoss(null);
        this.audio.playMusic('dungeon');
      }
      this.refreshHud();
      return;
    }

    if (rng.chance(m.kind === 'normal' ? 0.18 + run.stage * 0.01 : 1)) {
      const n = m.kind === 'boss' ? 8 + Math.floor(run.stage / 5) : m.kind === 'midboss' ? 5 : m.kind === 'elite' ? 3 + Math.floor(run.stage / 4) : 1;
      const id = ESSENCE(tier);
      const added = run.bag.add(id, n);
      if (added) loot(`+${added} ${ITEMS[id].name}`, hex(ITEMS[id].color));
      else this.hud.toast('가방이 가득 찼습니다');
    }
    // 차원 가루 (후반·엔드 콘텐츠 재료): 스테이지 보스는 5단계부터 (엔딩 뒤에는 모든 단계), 7단계 정예는 가끔.
    // 파수꾼 6~8, 수호자 16~24. 차원 응축기에서 파편·차원 정수로 가공한다
    const dustOk = run.end || tier >= 5 || this.progress.flag('endgame') > 0;
    const dustN = !dustOk ? 0 :
      m.kind === 'boss' ? rng.int(16, 24) + (tier >= 5 ? 6 : 0) : m.kind === 'midboss' ? rng.int(6, 8) + (tier >= 5 ? 3 : 0) : m.kind === 'elite' && tier >= 7 && rng.chance(0.15) ? 2 : 0;
    if (dustN && (!run.end || !m.isBoss)) {
      const added = run.bag.add(DUST, dustN);
      // 가방이 가득 차면 창고로 바로 보낸다 (귀한 재료라 잃지 않게)
      const stored = added < dustN ? this.progress.depositItem(DUST, dustN - added) : 0;
      if (added + stored) loot(`+${added + stored} ${ITEMS[DUST].name}`, hex(ITEMS[DUST].color));
      if (stored) this.hud.toast(`가방이 가득 차서 차원 가루 ${stored}개를 창고로 보냈습니다`);
    }
    // 장비: 수호자 2개, 파수꾼 1개, 정예는 가끔, 일반 몬스터는 드물게
    const eqCount = m.kind === 'boss' ? 2 : m.kind === 'midboss' ? 1 : rng.chance(m.kind === 'elite' ? 0.22 + run.stage * 0.01 : 0.004 + run.stage * 0.0003) ? 1 : 0;
    const bonus = (m.kind === 'midboss' ? 0.35 : m.kind === 'boss' ? 0.3 : m.kind === 'elite' ? 0.12 : 0) + run.stage * 0.01 + (run.end?.kind === 'rift' ? riftLuck(run.end.level) : run.end?.kind === 'ch8' ? CH8_LUCK : 0);
    for (let i = 0; i < eqCount; i++) {
      // 차원 등급: 보스만, 아주 낮은 확률 (수호자 1%, 파수꾼 0.3%)
      const dim = m.kind === 'boss' ? 0.01 : m.kind === 'midboss' ? 0.003 : 0;
      const e = rollEquip(rng, tier, this.progress.data.currentClass, bonus, dim, this.progress.data.unlockedClasses);
      if (e.grade >= GRADE.dimension) {
        this.level.effects.pillar(m.x, m.z, GRADES[e.grade].color, 10);
        this.hud.toast(`:sparkle: 차원 등급 장비! ${equipName(e)}`, 4000);
      }
      if (run.bag.addEquip(e)) loot(`${GRADES[e.grade].name} ${equipName(e)}`, hex(GRADES[e.grade].color));
      else this.hud.toast('가방이 가득 차서 장비를 줍지 못했습니다');
    }
    // 8장: 세트 장비를 떨어뜨리기도 한다. 파수꾼·수문장은 보통 보스처럼 한동안 다시 나오지 않는다
    if (run.end?.kind === 'ch8') {
      const ch = m.kind === 'boss' ? CH8_SET_DROP.boss : m.kind === 'midboss' ? CH8_SET_DROP.midboss : m.kind === 'elite' ? CH8_SET_DROP.elite : 0;
      if (ch && rng.chance(ch)) window.setTimeout(() => this.dropSetPiece(m.name), 400);
      if (m.isBoss) {
        this.progress.bossDefeated(8, run.stage, BOSS_RESPAWN_MS[m.kind as 'boss' | 'midboss']);
        this.hud.toast(`${m.name}은(는) ${formatWait(BOSS_RESPAWN_MS[m.kind as 'boss' | 'midboss'])} 뒤 다시 나타납니다`, 3000);
      }
      if (this.ch8Has('void')) this.player.mp = Math.min(this.player.maxMp, this.player.mp + this.player.maxMp * 0.06);
      if (this.ch8Has('mirror') && !m.isBoss && !this.mirrored.has(m) && Math.random() < 0.34 && this.level instanceof DungeonScene) {
        const lv = this.level;
        const x = m.x;
        const z = m.z;
        const sp = m.species;
        window.setTimeout(() => {
          if (this.level !== lv) return;
          const clone = lv.spawnMonster(sp, 'normal', x, z, -1, true);
          clone.hp = clone.maxHp * 0.5;
          clone.material.emissive.setHex(0x3a6a8a);
          this.mirrored.add(clone);
          lv.effects.ring(x, z, 1.4, CH8_RULES.mirror.color, 0.4);
        }, 700);
      }
    }
    // 보스는 쓰러뜨리면 한동안 다시 나오지 않는다 (파수꾼 1시간, 수호자 4시간)
    if ((m.kind === 'midboss' || m.kind === 'boss') && !run.end) {
      this.progress.bossDefeated(tier, run.stage, BOSS_RESPAWN_MS[m.kind]);
      run.bossKilled = true;
      this.saveNow();
      this.hud.toast(`${m.name}은(는) ${formatWait(BOSS_RESPAWN_MS[m.kind])} 뒤 다시 나타납니다`, 3000);
    }
    if (m.kind === 'midboss') {
      const plate = TIER_PLATE[tier - 1];
      if (run.bag.add(plate, 2)) loot(`+2 ${ITEMS[plate].name}`, hex(ITEMS[plate].color));
      run.bag.add('potion', 2);
    }

    if (m.isBoss) {
      this.hud.setBoss(null);
      this.audio.playMusic('dungeon');
    }
    if (m.isFinal && !run.end) {
      const p = this.progress;
      if (!p.data.dimStones.includes(tier)) {
        p.data.dimStones.push(tier);
        this.audio.play('stone');
        this.level.effects.pillar(m.x, m.z, 0x5ef0ff, 8);
        this.hud.toast(`차원석을 얻었다! (${p.stoneCount}/7)`, 4000);
        // 수호자의 차원석으로 궁극기가 열린다 (1-10, 4-10)
        const newUlt = ULTIMATES[p.data.currentClass].findIndex((u) => u.stone === tier);
        if (newUlt >= 0 && !p.unlockedUlts().includes(newUlt)) {
          const u = ULTIMATES[p.data.currentClass][newUlt];
          window.setTimeout(() => this.hud.toast(`궁극기 ${u.name}의 힘을 얻었다 — Lv.${u.level}이 되면 쓸 수 있습니다`, 4500), 2500);
        } else if (newUlt >= 0) {
          p.cls.ult = newUlt;
          const names = CLASS_ORDER.map((c) => ULTIMATES[c][newUlt].name).join(' · ');
          window.setTimeout(() => this.hud.toast(`:sparkle: 궁극기 획득! ${ULTIMATES[p.data.currentClass][newUlt].name} (모든 직업: ${names}) — 캐릭터 → 스킬에서 고를 수 있습니다`, 5000), 2500);
        }
      }
    }
    this.refreshHud();
  }

  /** 방의 몬스터를 모두 쓰러뜨렸을 때 */
  private roomClear(): void {
    const run = this.run!;
    run.roomCleared = true;
    run.stagesCleared++;
    this.progress.achAdd('rooms');
    if (run.end?.kind === 'trial') return this.finishTrial(true);
    if (run.end?.kind === 'raid') return this.finishRaid(true);
    if (run.end?.kind === 'horde') return;
    if (run.end) {
      const msg = this.endRoomClear(run.end);
      this.audio.play('portal');
      this.saveNow();
      this.refreshHud();
      this.openMenu(() =>
        this.screens.ask(
          msg,
          '워프 게이트가 열렸습니다. 워프 게이트로 이동하시겠습니까?',
          () => {
            this.afterMenu = () => this.moveToWarp();
            this.screens.close();
          },
          () => this.resume(),
        ),
      );
      return;
    }
    const g = stageIndex(run.tier, run.stage);
    const p = this.progress;
    // 채집 특화 맵은 스테이지 진행으로 치지 않는다
    if (!run.farm) {
      p.data.cleared = Math.max(p.data.cleared, g);
      this.quests.event({ type: 'stage', tier: run.tier });
    }
    this.audio.play('portal');
    this.saveNow();
    this.refreshHud();
    this.openMenu(() =>
      this.screens.ask(
        run.farm ? `${FARM_NAMES[run.farm]} 정리!` : `${run.tier}-${run.stage} 클리어!`,
        '워프 게이트가 열렸습니다. 워프 게이트로 이동하시겠습니까?',
        () => {
          this.afterMenu = () => this.moveToWarp();
          this.screens.close();
        },
        () => this.resume(),
      ),
    );
  }

  /** 워프 게이트 바로 앞 빈 바닥으로 순간이동 */
  private moveToWarp(): void {
    const lv = this.level;
    if (!(lv instanceof DungeonScene)) return;
    const gate = lv.interactables.find((i) => i.id === 'exit');
    if (!gate) return;
    const pos = this.player.position;
    for (let r = 1.6; r <= 4; r += 0.8) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const x = gate.x + Math.sin(a) * r;
        const z = gate.z + Math.cos(a) * r;
        if (!isFloor(lv.grid, Math.floor(x / TILE), Math.floor(z / TILE))) continue;
        if (lv.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.radius + PLAYER.radius)) continue;
        lv.effects.ring(pos.x, pos.z, 1.5, 0x7affc0, 0.4);
        this.player.setPosition(x, z);
        lv.effects.pillar(x, z, 0x7affc0);
        this.audio.play('portal');
        return;
      }
    }
  }

  private openWarp(): void {
    const run = this.run;
    if (!run) return;
    const end = run.end;
    if (end) {
      let next: EndRun | null = null;
      let nextLabel: string | null = null;
      if (end.kind === 'tower') {
        next = { kind: 'tower', floor: end.floor + 1 };
        nextLabel = `${end.floor + 1}층`;
      } else if (end.kind === 'ch8' && end.stage < 10) {
        next = { kind: 'ch8', stage: end.stage + 1 };
        nextLabel = `8-${end.stage + 1} ${CH8_STAGES[end.stage].name}`;
      } else if (end.kind === 'rush' && end.index < rushFights(end.diff).length - 1) {
        next = { ...end, index: end.index + 1 };
        nextLabel = rushFightName(rushFights(end.diff)[end.index + 1]);
      }
      this.openMenu(() =>
        this.screens.warp(
          this.endLabel(end, (this.level as DungeonScene).theme.name),
          nextLabel,
          () => {
            this.afterMenu = () => this.enterDungeon(1, 1, false, undefined, next!);
            this.screens.close();
          },
          () => {
            this.afterMenu = () => this.finishRun(end.kind === 'rush' && end.index < rushFights(end.diff).length - 1 ? '보스 러시 포기' : '귀환 성공');
            this.screens.close();
          },
          () => this.resume(),
        ),
      );
      return;
    }
    const g = stageIndex(run.tier, run.stage);
    // 채집 특화 맵에서는 마을로만 돌아간다
    const next = !run.farm && g < MAX_STAGE ? stageOf(g + 1) : null;
    this.openMenu(() =>
      this.screens.warp(
        run.farm ? `${run.tier}단계 ${FARM_NAMES[run.farm]}` : `${run.tier}-${run.stage}`,
        next ? `${next.tier}-${next.stage}` : null,
        () => {
          this.afterMenu = () => this.enterDungeon(next!.tier, next!.stage);
          this.screens.close();
        },
        () => {
          this.afterMenu = () => this.finishRun('귀환 성공');
          this.screens.close();
        },
        () => this.resume(),
      ),
    );
  }

  // =============== 채집 ===============
  private startGather(n: NodeInstance): void {
    if (!n.alive) return;
    const p = this.progress;
    if (n.def.style !== 'chest') {
      const tool = n.def.style === 'tree' ? 'tool_axe' : 'tool_pickaxe';
      if (!p.flag(tool)) {
        this.hud.toast(tool === 'tool_axe' ? '도끼가 있어야 나무를 벨 수 있습니다 (대장장이 고른)' : '곡괭이가 있어야 캘 수 있습니다 (대장장이 고른)', 2500);
        return;
      }
      const key: ToolKind = tool === 'tool_axe' ? 'axe' : 'pickaxe';
      const t = p.data.tools[key];
      if (t.dur <= 0) {
        this.hud.toast(`${toolName(key, t)}이(가) 망가졌습니다. 대장장이 고른에게 수리를 맡기세요`, 2500);
        return;
      }
      if (toolWear(t, n.def.tier) === null) {
        this.hud.toast(`${n.def.name}은(는) ${TOOL_TIER_NAMES[n.def.tier - 2]} ${TOOL_KIND_NAMES[key]} 이상이 있어야 캘 수 있습니다 (차원집 제작대)`, 3000);
        return;
      }
    }
    this.gathering = n;
  }

  /** 채집 중: 도구를 휘두를 때마다 한 번씩 캔다. 움직이면 멈춘다 */
  private updateGather(move: { x: number; y: number }): void {
    const n = this.gathering;
    const pl = this.player;
    if (!n) return;
    if (this.level instanceof DungeonScene && this.level.monsterNear(n.x, n.z)) {
      this.gathering = null;
      this.hud.toast('몬스터가 가까이 있어 채집을 멈췄습니다');
      return;
    }
    if (!n.alive || n.dying > 0 || Math.hypot(move.x, move.y) > 0.25 || Math.hypot(n.x - pl.position.x, n.z - pl.position.z) > n.def.radius + 2.2) {
      this.gathering = null;
      return;
    }
    if (!pl.canAct) return;
    const chest = n.def.style === 'chest';
    pl.startAction(
      {
        pose: chest ? 'thrust' : 'gather',
        tool: n.def.style === 'tree' ? 'axe' : 'pickaxe',
        duration: chest ? 0.35 : 0.7 / toolSpeed(this.progress.data.tools[n.def.style === 'tree' ? 'axe' : 'pickaxe']),
        hitAt: 0.6,
        moveMult: 0,
        onHit: () => this.gather(n),
      },
      Math.atan2(n.x - pl.position.x, n.z - pl.position.z),
    );
  }

  // ---------------- 자동 채집 ----------------
  private gatherHold = 0;
  /** 자동 채집: 시작한 자리, 캔 수, 못 캐는 채집물, 지금 걸어가는 채집물과 막힘 */
  private autoGather: { x: number; z: number; done: number; skip: Set<NodeInstance>; target: NodeInstance | null; best: number; stuck: number } | null = null;

  private startAutoGather(): void {
    const pl = this.player;
    this.gatherHold = 0;
    this.hud.setInteractCharge(-1);
    this.autoGather = { x: pl.position.x, z: pl.position.z, done: 0, skip: new Set(), target: this.gathering, best: Infinity, stuck: 0 };
    this.audio.play('level');
    this.level.effects.ring(pl.position.x, pl.position.z, AUTO_GATHER_RANGE, 0x8aff9a, 0.6, 0.1);
    this.hud.toast(`자동 채집 시작 — 반경 ${AUTO_GATHER_RANGE}m 안의 광맥·나무를 모두 캡니다 (움직이거나 몬스터가 오면 멈춤)`, 3000);
  }

  private stopAutoGather(msg?: string): void {
    const a = this.autoGather;
    if (!a) return;
    this.autoGather = null;
    this.gathering = null;
    if (msg) this.hud.toast(`${msg} (${a.done}개 캠)`, 2200);
  }

  /** 자동 채집 한 프레임: 다음 채집물을 고르고 걸어간다. 이동 벡터(화면 기준)를 돌려준다 */
  private updateAutoGather(dt: number): { x: number; y: number } {
    const a = this.autoGather!;
    const lv = this.level;
    const pl = this.player;
    const idle = { x: 0, y: 0 };
    if (!(lv instanceof DungeonScene) || !this.run) {
      this.autoGather = null;
      return idle;
    }
    if (lv.monsterNear(pl.position.x, pl.position.z)) {
      this.stopAutoGather('몬스터가 가까이 있어 자동 채집을 멈췄습니다');
      return idle;
    }
    // 캐는 중이면 그대로 (updateGather가 캔다)
    if (this.gathering && this.gathering.alive && this.gathering.dying === 0) return idle;
    let t = a.target;
    if (!t || !t.alive || t.dying > 0 || a.skip.has(t)) {
      if (t && (!t.alive || t.dying > 0)) a.done++;
      // 시작한 자리에서 가까운 것 중, 지금 나와 가장 가까운 채집물 (보물 상자는 습격이 있어 빼고)
      t = null;
      let bd = Infinity;
      for (const n of lv.nodes) {
        if (!n.alive || n.dying > 0 || n.def.style === 'chest' || a.skip.has(n)) continue;
        if (Math.hypot(n.x - a.x, n.z - a.z) > AUTO_GATHER_RANGE) continue;
        const d = Math.hypot(n.x - pl.position.x, n.z - pl.position.z);
        if (d < bd) {
          bd = d;
          t = n;
        }
      }
      a.target = t;
      a.best = Infinity;
      a.stuck = 0;
      if (!t) {
        const done = a.done;
        this.autoGather = null;
        this.gathering = null;
        this.audio.play('coin');
        this.hud.toast(`자동 채집 끝 — 주변 채집물을 모두 캤습니다 (${done}개)`, 2500);
        return idle;
      }
    }
    const dx = t.x - pl.position.x;
    const dz = t.z - pl.position.z;
    const d = Math.hypot(dx, dz);
    const reach = t.def.radius + 1.5;
    if (d <= reach) {
      if (!pl.canAct) return idle;
      this.startGather(t);
      // 도구가 없거나 약해서 못 캐는 것은 건너뛴다
      if (this.gathering !== t) a.skip.add(t);
      return idle;
    }
    // 걸어가다 막혀서 1.2초 동안 가까워지지 않으면 그 채집물은 건너뛴다
    if (d < a.best - 0.05) {
      a.best = d;
      a.stuck = 0;
    } else if ((a.stuck += dt) > 1.2) {
      a.skip.add(t);
      return idle;
    }
    const k = 1 / d;
    return { x: (dx * SCREEN_RIGHT.x + dz * SCREEN_RIGHT.z) * k, y: (dx * SCREEN_UP.x + dz * SCREEN_UP.z) * k };
  }

  private gather(n: NodeInstance): void {
    if (!(this.level instanceof DungeonScene) || !this.run) return;
    this.progress.achAdd('gathers');
    const s = this.toScreen(n.x, 1.6, n.z);
    let line = 0;
    if (n.def.style !== 'chest') {
      const key: ToolKind = n.def.style === 'tree' ? 'axe' : 'pickaxe';
      const t = this.progress.data.tools[key];
      const before = t.dur;
      t.dur = Math.max(0, t.dur - (toolWear(t, n.def.tier) ?? 1));
      if (t.dur === 0) {
        this.gathering = null;
        this.hud.toast(`${toolName(key, t)}이(가) 망가졌습니다! (대장장이 고른에게 수리)`, 3000);
      } else if (before > 20 && t.dur <= 20) this.hud.toast(`${toolName(key, t)} 내구도가 얼마 남지 않았습니다`, 2000);
    }
    const drops = this.level.hitNode(n);
    // 강화한 도구는 확률적으로 하나 더 캔다
    if (n.def.style !== 'chest' && drops.length && Math.random() < toolBonusChance(this.progress.data.tools[n.def.style === 'tree' ? 'axe' : 'pickaxe'])) drops.push({ itemId: drops[0].itemId, count: 1 });

    for (const drop of drops) {
      const added = this.run.bag.add(drop.itemId, drop.count);
      const item = ITEMS[drop.itemId];
      if (added > 0) {
        this.hud.floatText(s.x, s.y - line++ * 22, `+${added} ${item.name}`, hex(item.color), 'small');
        this.hud.log(`채집 · <span style="color:${hex(item.color)}">${item.name} ×${added}</span>`);
        this.quests.event({ type: 'gather', item: drop.itemId, count: added });
      }
      if (added < drop.count) {
        this.hud.toast('가방이 가득 찼습니다');
        this.gathering = null;
      }
    }
    // 황금 보고의 금화 더미: 다 부수면 골드가 쏟아진다
    if (n.def.id === 'gold_pile' && (n.dying > 0 || !n.alive)) {
      const g = Math.round(vaultPileGold(this.run.tier, Math.random()) * (1 + this.progress.bonus('gold')));
      this.run.gold += g;
      this.progress.data.gold += g;
      this.hud.floatText(s.x, s.y - line * 22, `+${g.toLocaleString()} G`, '#ffd23a', 'crit');
      this.hud.log(`황금 보고 · <span style="color:#ffd23a">${g.toLocaleString()} G</span>`);
      this.level.effects.sparks(n.x, 1, n.z, 0xffd23a, 16, { speed: 5, up: true });
      this.audio.play('coin');
    }
    this.shakeT = Math.max(this.shakeT, 0.08);
    this.audio.play('gather');
    // 보물 상자는 일정 확률로 '고급 상자': 상자를 지키던 몬스터 무리가 몰려온다. 모두 쓰러뜨리면 큰 보상
    if (n.def.id === 'chest' && (n.dying > 0 || !n.alive) && !this.ambush && Math.random() < AMBUSH_CHANCE) {
      const count = 10 + this.run.stage + this.run.tier * 2;
      const wave = this.level.spawnAmbush(n.x, n.z, count);
      this.ambush = { monsters: wave, tier: this.run.tier };
      this.level.effects.pillar(n.x, n.z, 0xffd23a, 5);
      this.shakeT = Math.max(this.shakeT, 0.5);
      this.audio.play('stone');
      this.hud.toast(`:sparkle: 고급 상자다! 상자를 지키던 몬스터 ${wave.length}마리가 몰려온다 — 모두 쓰러뜨리면 보상`, 3500);
    }
    this.refreshHud();
  }

  /** 고급 상자 습격을 다 막아 냈을 때 보상 */
  private ambushReward(): void {
    const a = this.ambush;
    const run = this.run;
    this.ambush = null;
    if (!a || !run) return;
    const rng = new Rng(randomSeed());
    const t = a.tier;
    const gold = Math.round(run.end ? 120 * t * (1 + run.stage * 0.1) : 110 * goldScale(t, run.stage));
    run.gold += gold;
    this.progress.data.gold += gold;
    const got: string[] = [`${gold} G`];
    const add = (id: string, n: number) => {
      const k = run.bag.add(id, n);
      if (k) got.push(`${ITEMS[id].name}×${k}`);
    };
    add(TIER_PLATE[t - 1], 2 + rng.int(0, 2));
    add(ESSENCE(t), 4 + rng.int(0, 3));
    add(ORE_TIERS[t - 1], 6 + rng.int(0, 5));
    if (rng.chance(0.35)) add(TIER_MANA_PLATE[t - 1], 1);
    const e = rollEquip(rng, t, this.progress.data.currentClass, 0.3, 0, this.progress.data.unlockedClasses);
    if (run.bag.addEquip(e)) got.push(`[${GRADES[e.grade].name}] ${equipName(e)}`);
    this.level.effects.pillar(this.player.position.x, this.player.position.z, 0xffd23a, 5);
    this.audio.play('level');
    this.hud.toast(`고급 상자 습격을 막아 냈다! 보상: ${got.join(', ')}`, 5000);
    this.saveNow();
  }

  /** 던전을 무사히 나왔다 (워프 게이트 또는 귀환석) */
  private finishRun(title: string): void {
    const run = this.run;
    if (!run) return;
    const p = this.progress;
    // 가방의 짐은 그대로 들고 나온다. 창고에 넣는 건 창고에서 직접
    const items = new Map<string, number>();
    for (const bag of [run.bag, run.dimBag]) for (const [id, n] of bag.totals()) items.set(id, (items.get(id) ?? 0) + n);
    for (const [id, n] of run.start) {
      const left = (items.get(id) ?? 0) - n;
      if (left > 0) items.set(id, left);
      else items.delete(id);
    }
    const equips = [...run.bag.equips(), ...run.dimBag.equips()].filter((e) => !run.startEquips.has(e.uid));
    this.returnPouch();
    p.setFlag('returned');
    this.audio.play('portal');
    const explored = this.exploredRatio();
    this.run = null;
    this.saveNow();
    this.openMenu(
      () =>
        this.screens.result(
          { title, items, equips, seconds: run.time, explored, gold: run.gold, exp: run.exp, stages: run.stagesCleared },
          () => this.resume(),
        ),
      () => {
        this.enterVillage('portal');
        this.saveNow();
      },
    );
  }

  /** 쓰러짐: 착용 장비는 남고, 일반 가방은 모두 잃고, 차원가방은 지켜진다 */
  private fall(timeOver = false): void {
    const run = this.run;
    if (!run) return;
    this.progress.achAdd('deaths');
    // 주간 시련은 쓰러져도 짐을 잃지 않는다 (처치 수만큼 점수)
    if (run.end?.kind === 'trial') return this.finishTrial(false);
    if (run.end?.kind === 'raid') return this.finishRaid(false);
    if (run.end?.kind === 'horde') return this.finishHorde();
    const p = this.progress;
    const lost = run.bag.totals();
    const lostEquips = run.bag.equips().length;
    const kept = run.dimBag.totals();
    const keptEquips = run.dimBag.equips();
    run.bag.clear();
    // 물약 주머니는 몸에 지닌 것이라 잃지 않는다
    this.returnPouch();
    p.setFlag('returned');
    const explored = this.exploredRatio();
    this.run = null;
    this.saveNow();
    this.openMenu(
      () =>
        this.screens.result(
          {
            title: timeOver ? '시간 초과…' : '쓰러졌다…',
            note: timeOver
              ? `${BOSS_TIME_LIMIT / 60}분 안에 쓰러뜨리지 못해 보스가 틈새를 붕괴시켰다. 일반 가방의 짐은 틈새에 삼켜졌다. (장비를 강화해서 다시 도전하자)`
              : '틈새가 몸을 마을로 밀어냈다. 일반 가방의 짐은 틈새에 삼켜졌다.',
            items: kept,
            equips: keptEquips,
            lost,
            lostEquips,
            seconds: run.time,
            explored,
            gold: run.gold,
            exp: run.exp,
            stages: run.stagesCleared,
          },
          () => this.resume(),
        ),
      () => {
        this.enterVillage('portal');
        this.saveNow();
      },
    );
  }

  private exploredRatio(): number {
    if (!this.minimap || !(this.level instanceof DungeonScene)) return 0;
    const d = this.level.grid;
    let total = 0;
    let seen = 0;
    for (let y = 0; y < d.height; y++)
      for (let x = 0; x < d.width; x++) {
        if (!isFloor(d, x, y)) continue;
        total++;
        if (this.minimap.isExplored(x, y)) seen++;
      }
    return total ? seen / total : 0;
  }

  // =============== 공장 ===============
  /** 제작대에서 완성된 장비·도구를 창고로 옮긴다 */
  private deliverWorkbench(list: BuildingState[] = this.factory.state.buildings): void {
    const p = this.progress;
    let tools = false;
    for (const b of list) {
      if (b.type !== 'workbench' || !b.ready?.length) continue;
      for (const j of b.ready) {
        if (j.kind === 'tool') {
          const k = j.id as ToolKind;
          p.data.tools[k] = newTool(j.tier);
          p.setFlag(k === 'axe' ? 'tool_axe' : 'tool_pickaxe');
          tools = true;
          this.hud.toast(`제작대: ${toolName(k, p.data.tools[k])} 완성! (지금 도구와 교체)`);
        } else if (j.kind === 'equip') {
          const e: Equip = { ...workJobEquip(j), uid: newUid(), grade: j.mana ? rollManaGrade(Math.random()) : 0 };
          e.series = rollSeries(e.slot, Math.random());
          withSpecials(e);
          p.data.equips.push(e);
          this.hud.toast(`제작대: ${j.mana ? `:sparkle: [${GRADES[e.grade].name}] ` : ''}${equipName(e)} 완성! (제작대 앞에 레일·출하 상자가 없어 공유 창고로)`);
        }
      }
      b.ready = [];
      this.audio.play('coin');
      if (tools) this.applyStats();
      this.saveNow();
    }
  }

  private buildingUnlocked(t: BuildingType): boolean {
    return !BUILDINGS[t].blueprint || this.progress.flag(`bp_${t}`) > 0;
  }

  private openBuilding(b: BuildingState): void {
    const p = this.progress;
    const save = () => this.saveNow();
    if (b.type === 'generator') this.openMenu(() => this.screens.generator(this.factory, b, p, save, () => this.resume()));
    else if (b.type === 'box') this.openMenu(() => this.screens.box(b, p, save, () => this.resume()));
    else if (b.type === 'warehouse') this.openMenu(() => this.screens.warehouse(p, b, save, () => this.resume()));
    else if (PRODUCER_TYPES.has(b.type)) this.openMenu(() => this.screens.producer(this.factory, b, p, save, () => this.resume()));
    else if (MACHINE_TYPES.has(b.type)) this.openMenu(() => this.screens.machine(this.factory, b, p, save, () => this.resume()));
    else if (b.type === 'workbench') this.openMenu(() => this.screens.workbench(this.factory, b, p, () => {
      this.applyStats();
      save();
    }, () => this.resume()));
  }

  private buildMode(on: boolean): void {
    this.building = on;
    this.hud.setBuilding(on);
    if (on) this.buildBar.show((t) => this.buildingUnlocked(t));
    else this.buildBar.hide();
    if (this.level instanceof HomeScene) {
      this.level.setBuildMode(on);
      if (!on) this.level.hideGhost();
    }
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.buildPan.set(0, 0, 0);
    if (on) this.fitBuildCamera();
  }

  /** 건설 모드 화면 이동 (공장 가운데에서 얼마나 옮겼는지) */
  private buildPan = new Vector3();
  private panning: { id: number; from: Vector3; start: Vector3 } | null = null;
  private touches = new Set<number>();

  /** 화면 좌표 → 바닥 위의 점 */
  private groundAt(e: PointerEvent): Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new Vector3();
    return this.raycaster.ray.intersectPlane(this.ground, hit) ? hit : null;
  }

  private setBuilding(on: boolean): void {
    this.buildMode(on);
    this.saveNow();
  }

  private fitBuildCamera(): void {
    if (!(this.level instanceof HomeScene)) return;
    const L = this.factory.size * TILE;
    const viewH = this.camera.top - this.camera.bottom;
    const viewW = this.camera.right - this.camera.left;
    // 건설 도구줄이 차지하는 높이를 빼고 공장이 다 보이게
    const free = Math.max(0.4, 1 - (this.buildBar.root.offsetHeight + 12) / Math.max(1, this.container.clientHeight));
    // 너무 작아지지 않게: 원래 비율에 가깝게 보여 주고, 넓은 차원집은 끌어서 둘러본다
    this.camera.zoom = Math.max(0.85, Math.min(1, viewW / (L * 1.55), (viewH * free) / (L * 1.25)));
    this.camera.updateProjectionMatrix();
  }

  private pickCell(e: PointerEvent): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, hit)) return null;
    const x = Math.floor(hit.x / TILE);
    const y = Math.floor(hit.z / TILE);
    return this.factory.inBounds(x, y) ? { x, y } : null;
  }

  /**
   * 건설 입력:
   * - 레일·마력선·철거: 누르고 끌면 연속으로
   * - 그 밖의 건물: 누른 채 움직이면 미리보기가 따라오고, 손을 떼면 그 자리에 짓는다
   */
  private setupBuildPointer(): void {
    const canvas = this.renderer.domElement;
    const isLine = () => this.buildBar.tool === 'belt' || this.buildBar.tool === 'wire' || this.buildBar.tool === 'remove';
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.building || this.mode !== 'play') return;
      this.touches.add(e.pointerId);
      const cell = this.pickCell(e);
      // 화면 이동: 화면 이동 도구, 두 손가락, 오른쪽·가운데 버튼, 공장 밖에서 누르기
      if (this.buildBar.tool === 'pan' || !cell || e.button === 1 || e.button === 2 || this.touches.size >= 2) {
        const g = this.groundAt(e);
        if (g) {
          canvas.setPointerCapture(e.pointerId);
          this.panning = { id: e.pointerId, from: g, start: this.buildPan.clone() };
          this.dragCell = this.ghostCell = null;
          if (this.level instanceof HomeScene) this.level.hideGhost();
        }
        return;
      }
      canvas.setPointerCapture(e.pointerId);
      const tool = this.buildBar.tool;
      if (tool === 'rotate') {
        const b = this.factory.at(cell.x, cell.y);
        if (b && b.type !== 'wire') {
          this.factory.rotate(cell.x, cell.y);
          this.audio.play('click');
        }
        return;
      }
      if (tool === 'move') {
        const b = this.factory.at(cell.x, cell.y);
        if (!b) return this.hud.toast('옮길 건물을 누른 채 끌어 주세요');
        this.moveFrom = cell;
        this.moveTo = cell;
        this.updateMoveGhost(cell);
        return;
      }
      if (isLine()) {
        this.dragCell = cell;
        this.applyTool(cell, null);
      } else {
        this.ghostCell = cell;
        this.updateGhost(cell);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.building || !(this.level instanceof HomeScene)) return;
      if (this.panning) {
        if (e.pointerId !== this.panning.id) return;
        const g = this.groundAt(e);
        if (!g) return;
        // 누른 곳이 손가락 밑에 그대로 있도록 카메라를 옮긴다
        this.buildPan.x -= g.x - this.panning.from.x;
        this.buildPan.z -= g.z - this.panning.from.z;
        const half = (this.factory.size * TILE) / 2 + 4;
        this.buildPan.x = Math.max(-half, Math.min(half, this.buildPan.x));
        this.buildPan.z = Math.max(-half, Math.min(half, this.buildPan.z));
        this.camTarget.x -= g.x - this.panning.from.x;
        this.camTarget.z -= g.z - this.panning.from.z;
        this.updateCameraNow();
        return;
      }
      const cell = this.pickCell(e);
      if (this.buildBar.tool === 'move' || this.buildBar.tool === 'rotate') {
        if (this.moveFrom && cell) {
          this.moveTo = cell;
          this.updateMoveGhost(cell);
        }
        return;
      }
      if (!isLine()) {
        // 마우스는 누르지 않아도 미리보기를 보여 준다
        if (cell && (this.ghostCell || e.pointerType === 'mouse')) {
          if (this.ghostCell) this.ghostCell = cell;
          this.updateGhost(cell);
        } else if (!cell) this.level.hideGhost();
        return;
      }
      this.level.hideGhost();
      if (cell) this.level.showCursor(cell.x, cell.y, this.buildBar.tool === 'remove' ? !!this.factory.at(cell.x, cell.y) : !this.factory.at(cell.x, cell.y));
      else this.level.hideCursor();
      if (!this.dragCell || !cell || (cell.x === this.dragCell.x && cell.y === this.dragCell.y)) return;
      let prev = this.dragCell;
      while (this.dragCell && (prev.x !== cell.x || prev.y !== cell.y)) {
        const dx = Math.sign(cell.x - prev.x);
        const dy = dx !== 0 ? 0 : Math.sign(cell.y - prev.y);
        const next = { x: prev.x + dx, y: prev.y + dy };
        this.applyTool(next, prev);
        prev = next;
      }
      if (this.dragCell) this.dragCell = cell;
    });
    const end = (e: PointerEvent) => {
      this.touches.delete(e.pointerId);
      if (this.panning) {
        if (e.pointerId === this.panning.id) this.panning = null;
        return;
      }
      this.dragCell = null;
      if (this.moveFrom) {
        const from = this.moveFrom;
        const to = this.moveTo;
        this.moveFrom = this.moveTo = null;
        if (this.level instanceof HomeScene) {
          this.level.hideGhost();
          this.level.hideCursor();
        }
        if (e.type === 'pointerup' && to && (to.x !== from.x || to.y !== from.y)) {
          if (this.factory.move(from.x, from.y, to.x, to.y)) {
            this.audio.play('build');
            this.saveNow();
          } else this.hud.toast('빈 칸으로만 옮길 수 있습니다');
        }
        return;
      }
      if (this.ghostCell && this.building && e.type === 'pointerup') {
        const cell = this.ghostCell;
        this.ghostCell = null;
        this.applyTool(cell, null);
        if (e.pointerType !== 'mouse' && this.level instanceof HomeScene) this.level.hideGhost();
      }
      this.ghostCell = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    // 오른쪽 버튼으로 끌어 화면 이동할 때 메뉴가 뜨지 않게
    canvas.addEventListener('contextmenu', (e) => {
      if (this.building) e.preventDefault();
    });
  }

  /** 이동 도구: 옮기는 건물을 손가락 아래에 미리 보여 준다 */
  private updateMoveGhost(cell: { x: number; y: number }): void {
    if (!(this.level instanceof HomeScene) || !this.moveFrom) return;
    const b = this.factory.at(this.moveFrom.x, this.moveFrom.y);
    if (!b) return;
    const same = cell.x === this.moveFrom.x && cell.y === this.moveFrom.y;
    const ok = same || !this.factory.at(cell.x, cell.y);
    this.level.showGhost(b.type, cell.x, cell.y, b.dir, ok);
    this.level.showCursor(cell.x, cell.y, ok);
  }

  private updateGhost(cell: { x: number; y: number }): void {
    if (!(this.level instanceof HomeScene)) return;
    const tool = this.buildBar.tool;
    if (tool === 'remove' || tool === 'move' || tool === 'rotate' || tool === 'pan') return;
    const existing = this.factory.at(cell.x, cell.y);
    const ok = (!existing || existing.type === tool) && this.progress.hasAll(BUILDINGS[tool].cost);
    this.level.showGhost(tool, cell.x, cell.y, existing && existing.type === tool ? existing.dir : this.buildBar.dir, ok);
    this.level.showCursor(cell.x, cell.y, ok);
  }

  private applyTool(cell: { x: number; y: number }, from: { x: number; y: number } | null): void {
    const f = this.factory;
    const p = this.progress;
    const tool = this.buildBar.tool;
    if (tool === 'move' || tool === 'rotate' || tool === 'pan') return;
    const existing = f.at(cell.x, cell.y);
    if (tool === 'remove') {
      if (!existing) return;
      f.remove(cell.x, cell.y, (id, n) => p.add(id, n), (e) => p.data.equips.push(e));
      for (const [id, n] of Object.entries(BUILDINGS[existing.type].cost)) p.add(id, n);
      // 제작대: 남은 작업의 재료와 골드를 돌려주고, 다 된 장비·도구는 창고로
      for (const j of [existing.job, ...(existing.queue ?? [])]) {
        if (!j) continue;
        for (const [id, n] of Object.entries(j.cost.items)) p.add(id, n * j.left);
        p.data.gold += j.cost.gold * j.left;
      }
      this.deliverWorkbench([existing]);
      this.audio.play('build');
      return;
    }
    let dir = this.buildBar.dir as Dir;
    if (from) {
      const dx = cell.x - from.x;
      const dy = cell.y - from.y;
      dir = (dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3) as Dir;
      const prev = f.at(from.x, from.y);
      if (prev && prev.type === 'belt' && tool === 'belt') prev.dir = dir;
    }
    if (existing) {
      // 이미 지은 건물을 누르면 (마력선·레일 도구가 아닐 때) 방향을 돌린다
      if (!from && (existing.type === tool || (tool !== 'belt' && tool !== 'wire' && existing.type !== 'wire'))) {
        f.rotate(cell.x, cell.y);
        this.audio.play('click');
      } else if (existing.type === tool && tool === 'belt') existing.dir = dir;
      return;
    }
    // 생산 건물은 개수 제한
    if (PRODUCER_TYPES.has(tool)) {
      const lim = PRODUCER_LIMIT[tool as ProducerType];
      if (f.state.buildings.filter((x) => x.type === tool).length >= lim) {
        this.hud.toast(`${BUILDINGS[tool].name}는 최대 ${lim}개까지 지을 수 있습니다`);
        this.dragCell = null;
        return;
      }
    }
    const cost = BUILDINGS[tool].cost;
    if (!p.hasAll(cost)) {
      const need = Object.entries(cost)
        .map(([id, n]) => `${ITEMS[id].name} ${p.count(id)}/${n}`)
        .join(', ');
      this.hud.toast(`재료가 부족합니다 (${need})`);
      this.dragCell = null;
      return;
    }
    p.takeAll(cost);
    const b = f.place(tool, cell.x, cell.y, dir);
    if (!b) return;
    if (tool === 'generator') p.setFlag('factoryBuilt');
    this.quests.event({ type: 'build', building: tool });
    this.audio.play('build');
    this.level.particles.burst((cell.x + 0.5) * TILE, 0.5, (cell.y + 0.5) * TILE, BUILDINGS[tool].color, 5, 0.6);
  }

  // =============== 매 프레임 ===============
  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.timerAcc += dt;
    if (this.timerAcc >= 1) {
      this.timerAcc = 0;
      this.updateTimers();
      this.tickAchievements();
    }

    // 공장은 어디에 있든 계속 돌아간다
    if (this.mode !== 'title' && this.progress.flag('home')) {
      this.factoryAcc += dt;
      while (this.factoryAcc >= 0.1) {
        this.factory.step(0.1);
        this.factoryAcc -= 0.1;
      }
      this.deliverWorkbench();
    }

    switch (this.mode) {
      case 'play':
        this.updatePlay(dt);
        break;
      case 'dead':
        this.deadTimer += dt;
        this.player.update(dt, { move: { x: 0, y: 0 }, applyMove: () => {} });
        this.level.update(dt, this.player.position);
        if (this.deadTimer > 1.6 && this.mode === 'dead') {
          this.fall(this.timeOver);
          this.timeOver = false;
        }
        break;
      case 'menu':
        if (this.input.consume('pause') || (this.input.consume('bag') && this.screens.isOpen)) this.screens.close();
        break;
      default:
        this.level.update(dt, this.player.position);
        this.player.update(dt, { move: { x: 0, y: 0 }, applyMove: () => {} });
    }

    if (this.mode !== 'title') {
      this.saveTimer += dt;
      if (this.saveTimer > 30) {
        this.saveTimer = 0;
        this.saveNow();
      }
    }

    this.updateCamera(dt);
    // 떠오르는 숫자는 세계에 고정: 카메라가 움직인 만큼 화면에서 밀어 준다
    const ref = this.toScreen(0, 0, 0);
    this.hud.tickFloats(dt, this.floatRef ? ref.x - this.floatRef.x : 0, this.floatRef ? ref.y - this.floatRef.y : 0);
    this.floatRef = ref;
    this.updateLabels();
    this.renderer.render(this.level.scene, this.camera);
  }

  private nearestInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    const p = this.player.position;
    for (const it of this.level.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < it.range && d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  private updatePlay(dt: number): void {
    const input = this.input;
    if (this.level instanceof DungeonScene) this.updateDebuffs(dt);
    if (this.mode !== 'play') return;
    if (input.consume('pause')) {
      if (this.bigMap) return this.setBigMap(false);
      return this.openPause();
    }
    if (input.consume('bag')) return this.openBagOrInventory();
    if (input.consume('char')) return this.openInventory('equip');
    if (input.consume('map')) this.setBigMap(!this.bigMap);
    if (input.consume('build')) {
      if (this.level instanceof HomeScene) this.setBuilding(!this.building);
    }
    if (input.consume('warp') && this.run && this.run.roomCleared && this.level instanceof DungeonScene && this.level.exitOpen) return this.openWarp();
    if (input.consume('recipes') && this.level instanceof HomeScene && !this.building) return this.openMenu(() => this.screens.recipeBook(this.progress, 'smelter', () => this.resume()));

    // 연타한 공격 입력을 잠시 기억해 두었다가 쓸 수 있을 때 쓴다
    if (input.consume('attack')) this.attackBuffer = 0.35;
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);

    if (this.hitStopT > 0) {
      this.hitStopT -= dt;
      return;
    }

    const pl = this.player;
    this.combat.update(dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    // 재생 실드: 초마다 최대 HP 2%
    if (pl.buff('shieldregen') && pl.alive) pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.02 * dt);
    if (this.run) this.run.time += dt;

    let move = this.building ? { x: 0, y: 0 } : input.getMove();
    // PC 마우스 이동: 누르고 있는 동안 커서를 따라가고, 떼면 마지막으로 찍은 곳까지 걸어간다
    if (!this.building && move.x === 0 && move.y === 0 && input.mouseMoveActive) {
      if (input.mouseMoveHeld || !this.mouseTarget) {
        const g = this.groundAt({ clientX: input.mouseX, clientY: input.mouseY } as PointerEvent);
        if (g) this.mouseTarget = { x: g.x, z: g.z };
        this.mouseBest = Infinity;
        this.mouseStuck = 0;
      }
      const t = this.mouseTarget;
      if (t) {
        const dx = t.x - pl.position.x;
        const dz = t.z - pl.position.z;
        const d = Math.hypot(dx, dz);
        // 막혀서 더 가까워지지 않으면 (0.6초) 멈춘다
        if (d < this.mouseBest - 0.05) {
          this.mouseBest = d;
          this.mouseStuck = 0;
        } else this.mouseStuck += dt;
        if ((d < 0.35 || this.mouseStuck > 0.6) && !input.mouseMoveHeld) {
          input.mouseMoveActive = false;
          this.mouseTarget = null;
        } else if (d >= 0.2) {
          // 세계 방향 → 화면 기준 이동 (화면 축은 서로 직교)
          const k = Math.min(1, d / 0.6) / d;
          move = { x: (dx * SCREEN_RIGHT.x + dz * SCREEN_RIGHT.z) * k, y: (dx * SCREEN_UP.x + dz * SCREEN_UP.z) * k };
        }
      }
    } else if (!input.mouseMoveActive) this.mouseTarget = null;
    // 자동 채집: 직접 움직이면 멈추고, 아니면 다음 채집물로 걸어간다
    if (this.autoGather) {
      if (Math.hypot(move.x, move.y) > 0.25) this.stopAutoGather('직접 움직여 자동 채집을 멈췄습니다');
      else move = this.updateAutoGather(dt);
    }
    const near = this.building ? null : this.nearestInteractable();
    this.hud.setInteract(this.autoGather ? `자동 채집 ${this.autoGather.done}` : near ? near.label : null);

    if (input.consume('interact')) {
      if (this.autoGather) this.stopAutoGather('자동 채집을 멈췄습니다');
      else if (near) {
        near.action();
        if (this.mode !== 'play') return;
      }
    }
    // 채집 버튼(키)을 3초 꾹 누르면 주변 채집물을 자동으로 모두 캔다
    // 채집물 앞에서 누르기 시작했으면, 캐던 채집물이 다 캐져도 계속 누르고 있는 동안 센다
    const canHold = !this.autoGather && this.level instanceof DungeonScene && !!this.run && input.held('interact') && (this.gatherHold > 0 || near?.id === 'node' || !!this.gathering);
    if (canHold) {
      this.gatherHold += dt;
      this.hud.setInteractCharge(this.gatherHold / AUTO_GATHER_HOLD);
      if (this.gatherHold >= AUTO_GATHER_HOLD) this.startAutoGather();
    } else if (this.gatherHold > 0 || !input.held('interact')) {
      this.gatherHold = 0;
      this.hud.setInteractCharge(-1);
    }
    if (input.consume('dodge') && !this.building) {
      // 회피: 검사는 구르기, 마법사는 블링크(무적 없음), 궁수는 후방 도약(무적 + 덫)
      const cls = pl.cls.id;
      let ok = false;
      if (cls === 'mage' || cls === 'summoner') {
        // 소환사: 차원 도약 (블링크와 같고, 곁의 소환수가 함께 따라온다)
        const sx = pl.position.x;
        const sz = pl.position.z;
        const col = cls === 'summoner' ? 0xff8ae0 : 0xc8a8ff;
        ok = pl.startBlink(move, () => {
          const fx = this.level.effects;
          fx.streak(sx, sz, pl.position.x, pl.position.z, cls === 'summoner' ? 0xff5ae0 : 0xa070ff, 0.5);
          fx.ring(pl.position.x, pl.position.z, 1.4, col, 0.25, 0.8);
          fx.sparks(pl.position.x, 1, pl.position.z, col, 10, { speed: 4 });
          if (cls === 'summoner')
            for (const m of this.combat.minions.list) {
              if (m.spec.stationary || Math.hypot(m.x - sx, m.z - sz) > 4) continue;
              m.x = pl.position.x + (m.x - sx);
              m.z = pl.position.z + (m.z - sz);
            }
        });
        if (ok) {
          this.level.effects.sparks(sx, 1, sz, 0xc8a8ff, 12, { speed: 4, up: true, spread: 0.5 });
          this.audio.play('magic');
        }
      } else if (cls === 'archer') ok = this.combat.backstep(move);
      else if (pl.startRoll(move)) {
        ok = true;
        this.audio.play('dash');
      }
      if (ok) {
        this.gathering = null;
        this.planDodge();
      }
    }
    for (let i = 0; i < 3; i++) {
      if (input.consume(`skill${i + 1}` as 'skill1')) {
        const idx = this.progress.cls.quick[i] ?? -1;
        if (idx < 0) this.hud.toast('스킬 칸이 비어 있습니다 (캐릭터 → 스킬에서 배치)');
        else if (awakenHolds(SKILL_AWAKEN[this.progress.data.currentClass][idx], this.progress.awakenOf(`s${idx}`))) {
          // 집중형 각성: 누르고 있는 동안 힘을 모은다
          const b = this.combat.skillBlock(idx);
          if (b) this.hud.toast(b);
          else if (b === null && !this.charging) this.charging = { slot: i, ult: false, index: idx, t: 0, fx: 0 };
        } else {
          const msg = this.combat.useSkill(idx);
          if (msg) this.hud.toast(msg);
          else this.gathering = null;
        }
      }
    }
    if (input.consume('ult')) {
      const ui = this.progress.ultIndex;
      // 천검난무 B(검무 보류): 도는 중에 다시 누르면 멈추고, 멈춘 뒤 다시 누르면 이어서
      if (this.combat.toggleStorm()) this.hud.toast(this.combat.storm?.paused ? '검무 보류 — 10초 안에 다시 누르면 이어서 돈다' : '검무 재개!', 1400);
      else {
        const block = ui < 0 ? '궁극기는 1-10 수호자를 처음 쓰러뜨리면 얻습니다' : this.combat.ultBlock(ui);
        if (block) this.hud.toast(block);
        else if (block === null) this.fireUlt(ui, 0);
      }
    }
    if (this.charging) {
      move = { x: move.x * 0.5, y: move.y * 0.5 };
      this.updateCharging(dt);
    }
    if (input.consume('potion')) this.drinkPotion();
    if ((this.attackBuffer > 0 || input.attackHeld) && !this.building && pl.canAct) {
      this.attackBuffer = 0;
      this.gathering = null;
      if (this.autoGather) this.stopAutoGather('공격해서 자동 채집을 멈췄습니다');
      this.combat.basicAttack();
    }
    if (!this.building) this.updateGather(move);

    const level = this.level;
    const obstacles = level instanceof DungeonScene ? level.playerObstacles() : level.obstacles;
    pl.update(dt, {
      move,
      applyMove: (dx, dz) => moveWithCollision(level.grid, pl.position, dx, dz, PLAYER.radius, pl.activeDash?.ghost ? [] : obstacles),
    });
    level.update(dt, pl.position);

    // 차원집 마력 치유석: 곁에 서 있으면 전력을 써서 빠르게 회복
    if (level instanceof HomeScene) {
      for (const b of this.factory.state.buildings) {
        if (b.type !== 'healer') continue;
        const near = Math.hypot((b.x + 0.5) * TILE - pl.position.x, (b.y + 0.5) * TILE - pl.position.z) < TILE * 1.6;
        const needs = pl.hp < pl.maxHp || pl.mp < pl.maxMp;
        b.active = near && needs;
        if (b.active && this.factory.powerOf(b) > 0) {
          const k = 0.12 * dt * this.factory.powerOf(b);
          pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * k);
          pl.mp = Math.min(pl.maxMp, pl.mp + pl.maxMp * k);
          this.healFx += dt;
          if (this.healFx > 0.25) {
            this.healFx = 0;
            level.particles.burst(pl.position.x, 0.4, pl.position.z, 0x6aff9a, 4, 0.5);
          }
        } else if (b.active && near && !this.factory.connected(b) && this.healFx >= 0) {
          this.healFx = -5;
          this.hud.toast('마력 치유석이 마력선으로 발전기와 이어져 있지 않습니다', 2000);
        }
      }
      if (this.healFx < 0) this.healFx = Math.min(0, this.healFx + dt);
    }
    if (this.ambush && this.ambush.monsters.every((m) => !m.alive)) this.ambushReward();
    if (level instanceof DungeonScene && this.run) {
      // 보스가 여럿이면 (보스 러시) 쓰러진 보스 다음으로 살아 있는 보스를 보여 준다
      if (level.boss && !level.boss.alive) level.boss = level.monsters.find((m) => m.alive && m.isBoss) ?? level.boss;
      // 보스가 둘 이상이면 머리 위에 각자의 체력 (남은 줄 수 ×N)
      const bosses = level.monsters.filter((m) => m.alive && m.isBoss);
      this.hud.setBossTags(
        bosses.length > 1
          ? bosses.map((m) => {
              const sp = this.toScreen(m.x, m.rig.height * m.rig.root.scale.y + 0.9, m.z);
              return { x: sp.x, y: sp.y, name: m.name, ratio: m.hp / m.maxHp, bars: m.bars, shielded: m.shielded };
            })
          : [],
      );
      const boss = level.boss;
      const ek = this.run.end?.kind;
      if (boss && boss.alive && boss.aggro && ek === 'horde') {
        // 무한 러쉬: 보스에게 제한 시간은 없다
        this.hud.setBoss(`${boss.name}${boss.shielded ? ` · 보호막 (수호병 ${boss.guardsLeft})` : ''}`, boss.hp / boss.maxHp, boss.bars, boss.shielded, false);
      } else if (boss && boss.alive && boss.aggro) {
        // 보스 제한 시간: 싸움이 시작되면 흐른다
        this.bossTime += dt;
        const trialRun = ek === 'trial';
        const left = Math.max(0, (trialRun ? TRIAL_TIME : ek === 'raid' ? RAID_TIME : BOSS_TIME_LIMIT) - this.bossTime);
        if (left <= 0 && !boss.dooming && !this.timeOver && ek !== 'trial' && ek !== 'raid') {
          // 시간이 다 되면 보스가 방 전체 즉사기를 시전한다 (막을 수도 피할 수도 없다)
          this.timeOver = true;
          level.startBossDoom();
          this.audio.play('stone');
        }
        const clock = `:hourglass: ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
        const tag = boss.trialBoss ? `${boss.shielded ? ` · 보호막 (수호병 ${boss.guardsLeft})` : ''}${boss.rage ? ` · 격노 ${boss.rage}단계 · ${((1 - boss.hp / boss.maxHp) * 100).toFixed(1)}%` : ` · ${((1 - boss.hp / boss.maxHp) * 100).toFixed(1)}%`}` : boss.dooming ? ' · :skull: 틈새 붕괴' : boss.shielded ? ` · 보호막 (수호병 ${boss.guardsLeft})` : boss.exposed ? ' · 빈틈!' : boss.phase2 ? ' · 격노' : '';
        this.hud.setBoss(`${boss.name}${tag}  ${clock}`, boss.hp / boss.maxHp, boss.bars, boss.shielded, left < 60);
        this.audio.playMusic('boss');
      }
      const end = this.run.end;
      if (end?.kind === 'trial' && !this.run.roomCleared) {
        if (Math.floor(this.run.time) !== Math.floor(this.run.time - dt)) this.hud.setLocation(this.endLabel(end, level.theme.name), level.theme.portalColor);
        if (this.bossTime >= TRIAL_TIME) return this.finishTrial(false);
      }
      if (end?.kind === 'raid' && !this.run.roomCleared) {
        if (Math.floor(this.run.time) !== Math.floor(this.run.time - dt)) this.hud.setLocation(this.endLabel(end, level.theme.name), level.theme.portalColor);
        if (this.bossTime >= RAID_TIME) {
          this.run.roomCleared = true;
          return this.finishRaid(false);
        }
      }
      if (end?.kind === 'horde' && this.mode === 'play') this.updateHorde(dt, level, end);
      if (end?.kind === 'ch8') this.updateCh8(dt, level);
      if (end?.kind === 'rift' && !this.run.roomCleared) {
        const before = Math.ceil(end.timeLeft);
        end.timeLeft -= dt;
        if (Math.ceil(end.timeLeft) !== before && end.timeLeft > -1) this.hud.setLocation(this.endLabel(end, level.theme.name), level.theme.portalColor);
        if (end.timeLeft <= 0 && !this.run.riftLate) {
          this.run.riftLate = true;
          this.hud.toast(':hourglass: 시간 초과! 끝까지 정리하면 보상은 절반, 다음 단계는 열리지 않습니다', 4000);
        }
      }
      if (level.waves.length && end?.kind !== 'raid') this.hud.setWave(Math.max(1, level.waveIndex), level.waves.length, level.exitOpen);
      if (!this.run.roomCleared && level.exitOpen) this.roomClear();
    }
    this.updateMap(dt);
    this.refreshHud();
  }

  private updateMap(dt: number): void {
    const mm = this.minimap;
    if (!mm) return;
    const pl = this.player;
    const level = this.level;
    if (level instanceof DungeonScene) mm.reveal(pl.position.x, pl.position.z);
    this.minimapTimer -= dt;
    if (this.minimapTimer > 0) return;
    this.minimapTimer = this.bigMap ? 0.2 : 0.1;
    const markers: MapMarker[] = [];
    if (level instanceof DungeonScene) {
      for (const n of level.nodes) if (n.alive) markers.push({ x: n.x, z: n.z, color: hex(n.def.accentColor), size: 0.45 });
      for (const m of level.monsters) if (m.alive) markers.push({ x: m.x, z: m.z, color: m.isBoss ? '#ff1a1a' : m.kind === 'elite' ? '#ffb020' : '#ff3030', size: m.isBoss ? 1.2 : m.kind === 'elite' ? 0.85 : 0.7, label: m.isBoss ? m.name : undefined, outline: true });
      const exit = level.portals.find((p) => p.kind === 'exit')!;
      markers.push({ x: exit.x, z: exit.z, color: level.exitOpen ? hex(level.theme.portalColor) : '#777', size: 1.1, label: '워프 게이트' });
    } else {
      for (const it of level.interactables) {
        if (!it.title) continue;
        const npc = NPC_IDS.has(it.id);
        markers.push({ x: it.x, z: it.z, color: npc ? '#ffe07a' : '#8fd8ff', size: npc ? 0.7 : 0.9, label: it.title });
      }
    }
    mm.draw({ ...pl.position, facing: pl.facing }, markers, false);
    if (this.bigMap) mm.draw({ ...pl.position, facing: pl.facing }, markers, true);
  }

  /**
   * 물약: 던전에는 물약 주머니(최대 10개)만 들고 간다. 좋은 물약부터 채우고, 방을 넘어갈 때마다 가방에서 다시 채운다.
   * 마을·차원집에서는 가방의 물약을 바로 마신다. 어디서든 재사용 대기 8초
   */
  private drinkPotion(): void {
    if (this.potionCd > 0) return this.hud.toast(`물약 재사용 대기 ${Math.ceil(this.potionCd)}초`, 900);
    const pl = this.player;
    if (pl.hp >= pl.maxHp && pl.mp >= pl.maxMp) return this.hud.toast('HP와 MP가 가득합니다', 900);
    if (this.runVow('nopotion')) return this.hud.toast('균열 서약 「물약 금지」: 물약을 마실 수 없습니다', 1200);
    let id: string | undefined;
    if (this.run && this.level instanceof DungeonScene) {
      id = this.run.pouch.shift();
      if (!id) return this.hud.toast('물약 주머니가 비었습니다 (다음 방으로 가면 가방에서 다시 채워짐)');
    } else {
      id = POTION_KINDS.find(([k]) => this.progress.count(k) > 0)?.[0];
      if (!id || !this.progress.take(id, 1)) return this.hud.toast('물약이 없습니다 (상점·연금 솥에서 구하기)');
    }
    const heal = POTION_KINDS.find(([k]) => k === id)![1];
    pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * heal);
    pl.mp = Math.min(pl.maxMp, pl.mp + pl.maxMp * heal);
    this.potionCd = POTION_COOLDOWN;
    this.progress.achAdd('potions');
    if (this.run?.end?.kind === 'trial') this.run.end.potions++;
    this.level.effects.ring(pl.position.x, pl.position.z, 2, 0xff7a9a, 0.4);
    this.audio.play('pickup');
  }

  /** 물약 주머니를 가방·창고의 물약으로 채운다 (좋은 물약부터) */
  private fillPouch(): void {
    const run = this.run;
    if (!run) return;
    // 시련: 모두 같은 물약 3개 (가방의 물약은 쓰지 않고, 끝나면 사라진다)
    if (run.end?.kind === 'trial') {
      if (!run.pouch.length) run.pouch = ['potion_mid', 'potion_mid', 'potion_mid'];
      return;
    }
    const before = run.pouch.length;
    while (run.pouch.length < POTION_POUCH) {
      const id = POTION_KINDS.find(([k]) => this.progress.count(k) > 0)?.[0];
      if (!id || !this.progress.take(id, 1)) break;
      run.pouch.push(id);
    }
    const rank = (id: string) => POTION_KINDS.findIndex(([k]) => k === id);
    run.pouch.sort((a, b) => rank(a) - rank(b));
    if (run.pouch.length > before && before > 0) this.hud.toast(`물약 주머니 보충 (${run.pouch.length}/${POTION_POUCH})`, 1500);
  }

  /** 던전을 나올 때 남은 물약을 가방(가득이면 창고)으로 돌려놓는다 */
  private returnPouch(): void {
    const run = this.run;
    if (!run) return;
    for (const id of run.pouch) if (run.bag.add(id, 1) === 0) this.progress.add(id, 1);
    run.pouch = [];
  }

  /** 마을·차원집 상단 타이머: 재등장 대기 중인 보스와 채집 맵 */
  // =============== 업적 (v10) ===============
  private lastGold = -1;
  private lastDodges = 0;
  private achNotified = new Set<string>();
  /** 업적을 확인할 값들 */
  private achCtx(): AchCtx {
    const p = this.progress;
    const e = p.data.end!;
    return {
      c: p.data.ach?.c ?? {},
      towerBest: e.towerBest,
      riftBest: e.riftBest,
      rushBest: e.horde?.best ?? 0,
      transcend: Math.max(...CLASS_ORDER.map((c) => p.data.classes[c].tlv ?? 0)),
      ch8: p.data.ch8?.cleared ?? 0,
      discovered: p.discovered,
      classes: CLASS_ORDER.filter((c) => p.data.classes[c].level >= MAX_LEVEL).length,
      awakened: CLASS_ORDER.reduce((a, c) => a + Object.keys(p.data.classes[c].awaken ?? {}).length, 0),
    };
  }
  /** 받을 수 있는 업적 수 */
  achClaimable(): number {
    const ctx = this.achCtx();
    const done = this.progress.data.ach?.done ?? [];
    return ACHIEVEMENTS.filter((a) => !done.includes(a.id) && a.value(ctx) >= a.goal).length;
  }
  /** 1초마다: 번 골드·회피 수를 세고, 새로 달성한 업적을 알린다 */
  private tickAchievements(): void {
    const p = this.progress;
    if (this.mode === 'title' || !p) return;
    if (this.lastGold >= 0 && p.data.gold > this.lastGold) p.achAdd('gold', p.data.gold - this.lastGold);
    this.lastGold = p.data.gold;
    if (this.player) {
      if (this.player.dodgeCount > this.lastDodges) p.achAdd('dodges', this.player.dodgeCount - this.lastDodges);
      this.lastDodges = this.player.dodgeCount;
    }
    if (!p.flag('endgame')) return;
    const ctx = this.achCtx();
    const done = p.data.ach?.done ?? [];
    for (const a of ACHIEVEMENTS) {
      if (done.includes(a.id) || this.achNotified.has(a.id) || a.value(ctx) < a.goal) continue;
      this.achNotified.add(a.id);
      this.hud.toast(`:sparkle: 업적 달성: 「${a.name}」 — 메뉴 → 업적에서 영겁의 증표 ${a.marks}개를 받으세요`, 3500);
    }
  }
  private openAchievements(back?: () => void): void {
    const p = this.progress;
    this.openMenu(() =>
      this.screens.achievements(
        p,
        this.achCtx(),
        (id: string) => {
          const a = ACH_BY_ID[id];
          const st = (p.data.ach ??= newAch());
          if (!a || st.done.includes(id) || a.value(this.achCtx()) < a.goal) return;
          st.done.push(id);
          p.add(MARK, a.marks);
          this.audio.play('coin');
          this.checkTitles();
          this.saveNow();
          this.openAchievements(back);
        },
        back ?? (() => this.resume()),
      ),
    );
  }

  private updateTimers(): void {
    const town = this.mode !== 'title' && (this.level instanceof VillageScene || this.level instanceof HomeScene);
    if (!town) return this.hud.setTimers(null);
    const p = this.progress;
    const img = (id: string) => {
      const u = itemIconUrl(id);
      return u ? `<img class="mico-inline" src="${u}" alt="">` : '';
    };
    const chips: string[] = [];
    // 채집 특화 맵은 1-5 파수꾼을 깨야 열린다
    for (const kind of p.farmUnlocked(1) ? (['wood', 'ore', 'gold'] as const) : []) {
      const w = p.farmWait(kind);
      chips.push(`${img(kind === 'wood' ? 'wood' : kind === 'gold' ? 'gold_ore' : 'copper_ore')}${FARM_NAMES[kind]} ${w > 0 ? `<b>${formatWait(w)}</b>` : '<b class="ok">입장 가능</b>'}`);
    }
    const bosses = Object.keys(p.data.bossReadyAt ?? {})
      .map((k) => {
        const [t, st] = k.split('-').map(Number);
        return { k, t, st, w: p.bossWait(t, st) };
      })
      .filter((b) => b.w > 0)
      .sort((a, b) => a.t - b.t || a.st - b.st);
    if (bosses.length) for (const b of bosses) chips.push(`${b.k} ${b.st === 10 ? '수호자' : '파수꾼'} <b>${formatWait(b.w)}</b>`);
    else chips.push('보스 <b class="ok">모두 출현 중</b>');
    this.hud.setTimers(chips);
  }

  private refreshHud(): void {
    const p = this.progress;
    const pl = this.player;
    const c = p.cls;
    this.hud.setBars(pl.hp, pl.maxHp, pl.mp, pl.maxMp, c.exp, expToNext(c.level), c.level);
    this.hud.setGold(p.data.gold);
    if (this.run && this.level instanceof DungeonScene) {
      const d = this.level;
      const left = d.aliveCount;
      const boss = d.boss && d.boss.alive ? ` · ${d.boss.name}` : '';
      const amb = this.ambush ? this.ambush.monsters.filter((m) => m.alive).length : 0;
      const ek = this.run.end;
      const head =
        ek?.kind === 'horde'
          ? `처치 ${ek.kills} · 다음 축복까지 ${Math.max(0, (this.horde?.next ?? 0) - ek.kills)} · 축복 ${ek.picks}개`
          : ek?.kind === 'raid'
            ? `${d.boss?.name ?? '레이드 보스'}을(를) 쓰러뜨리자${d.boss?.shielded ? ` · 수호병 ${d.boss.guardsLeft}` : ''}`
            : amb > 0
              ? `:sparkle: 고급 상자 습격! 남은 몬스터 ${amb}`
              : left > 0
                ? `남은 몬스터 ${left}${boss} (M: 지도)`
                : '워프 게이트로 가자 (다음 방 / 마을)';
      // 방을 정리했으면 언제든 워프 창을 열 수 있는 버튼
      this.hud.setWarpButton(!!this.run.roomCleared && d.exitOpen);
      this.hud.setObjective([head, ...questLines(p, this.quests)].join('\n'));
    } else {
      // 마을·차원집: 이야기 목표 + 추적 중인 퀘스트
      const main = objective(p, this.quests);
      const lines = questLines(p, this.quests, 4).filter((l) => !main.includes(l.split(':')[0]));
      this.hud.setObjective([main || lines.shift() || '', ...lines].filter(Boolean).join('\n'));
    }
    this.hud.setBuffs(pl.buffs.map((b) => ({ text: `${b.name}${b.stacks !== undefined ? ` ${b.stacks}회` : ''} ${Math.ceil(b.t)}s`, bad: b.bad })));
    this.hud.setPotions(this.run && this.level instanceof DungeonScene ? this.run.pouch.length : POTION_KINDS.reduce((a, [k]) => a + p.count(k), 0), this.potionCd / POTION_COOLDOWN);
    this.hud.setDodgeCooldown(pl.dodgeStock < 1 && pl.dodgeMax > 0 ? pl.rollCooldown / pl.dodgeMax : 0, pl.dodgeCharges > 1 ? pl.dodgeStock : -1);
    const dc = pl.cls.id;
    this.hud.setDodgeIcon(dc === 'sword' ? null : skillIconUrl(dc, 8), dc === 'mage' ? '블링크' : dc === 'archer' ? '후방 도약' : dc === 'summoner' ? '차원 도약' : '');
    const skills = pl.cls.skills;
    const quick = p.cls.quick.map((i) => (i >= 0 && (p.cls.skills[i] ?? 0) > 0 ? i : -1));
    const cb = this.combat;
    this.hud.setSkills(
      quick.map((i) => (i >= 0 && cb.stock[i] < 1 ? (cb.cooldowns[i] ?? 0) / Math.max(0.1, cb.cdMax[i]) : 0)),
      quick.map((i) => i < 0 || pl.mp >= skills[i].mp),
      quick.map((i) => (i >= 0 ? skills[i].name : null)),
      quick.map((i) => (i >= 0 ? skillIconUrl(pl.cls.id, i) : '')),
      quick.map((i) => (i >= 0 && cb.stock[i] < 1 ? (cb.cooldowns[i] ?? 0) : 0)),
      quick.map((i) => (i >= 0 && cb.maxStock(i) > 1 ? cb.stock[i] : -1)),
      this.charging && !this.charging.ult ? { slot: this.charging.slot, k: Math.min(1, this.charging.t / AWAKEN_HOLD) } : null,
    );
    // 궁극기 칸
    const ui = p.ultIndex;
    if (ui < 0) this.hud.setUlt({ name: '궁극기', icon: '', ratio: 0, secs: 0, ready: true, lockedMsg: '궁극기는 1-10 수호자를 처음 쓰러뜨리면 얻습니다 (4-10 수호자를 쓰러뜨리면 하나 더)' });
    else {
      const u = ULTIMATES[pl.cls.id][ui];
      const empty = this.combat.ultStock < 1;
      const storm = this.combat.storm;
      this.hud.setUlt({
        name: u.name,
        icon: skillIconUrl(pl.cls.id, 6 + ui),
        ratio: empty ? this.combat.ultCooldown / this.combat.ultCooldownMax : 0,
        secs: empty ? this.combat.ultCooldown : 0,
        ready: pl.mp >= u.mp,
        stock: -1,
        // 검무 보류: 멈춰 있는 동안 이어 쓸 수 있는 남은 시간을 둘레로
        charge: storm?.paused ? storm.resumeLeft / STORM_RESUME : -1,
      });
    }
    const inv = this.run ? this.run.bag : this.progress.invBag;
    this.hud.setBagCount(inv.used, inv.slots.length);
  }

  /** 이름표와 생산 아이콘 */
  private updateLabels(): void {
    if (this.mode !== 'play') {
      this.hud.setLabels([]);
      this.hud.setBubbles([]);
      return;
    }
    const labels: { text: string; x: number; y: number; accent?: boolean; self?: boolean }[] = [];
    const p = this.player.position;
    // 머리 위 내 닉네임
    const nick = this.progress.data.nickname;
    if (nick && !this.building) {
      const s = this.toScreen(p.x, 2.35, p.z);
      labels.push({ text: nick, x: s.x, y: s.y, self: true });
    }
    if (!this.building) {
      for (const it of this.level.interactables) {
        if (!it.title || Math.hypot(it.x - p.x, it.z - p.z) > 14) continue;
        const isNpc = NPC_IDS.has(it.id);
        let mark = '';
        if (isNpc) {
          const ref = it.id as NpcRef;
          const dailyReady = (it.id === 'chief' && this.dailyReady()) || (it.id === 'researcher' && this.quests.isDone('m_research') && this.progress.bestiaryClaimable > 0);
          if (dailyReady || this.quests.activeFor(ref).some((q) => this.quests.canComplete(q))) mark = '? ';
          else if (hasStory(it.id as NpcId, this.progress) || this.quests.available(ref).length) mark = '! ';
        }
        const s = this.toScreen(it.x, isNpc ? 2.3 : it.id === 'portal' ? 4.6 : 3.3, it.z);
        labels.push({ text: `${mark}${it.title}`, x: s.x, y: s.y, accent: !!mark });
      }
    }
    // 채집 자원 이름: 가까이 있고 주변에 몬스터가 없을 때 (참나무·적송처럼 닮은 자원을 구분)
    if (this.level instanceof DungeonScene && !this.building) {
      const d = this.level;
      for (const n of d.nodes) {
        if (!n.alive || n.dying > 0 || n.def.style === 'chest') continue;
        if (Math.hypot(n.x - p.x, n.z - p.z) > n.def.radius + 5 || d.monsterNear(n.x, n.z)) continue;
        const key: ToolKind = n.def.style === 'tree' ? 'axe' : 'pickaxe';
        const t = this.progress.data.tools[key];
        const has = this.progress.flag(key === 'axe' ? 'tool_axe' : 'tool_pickaxe') > 0;
        const need = !has ? ` (${TOOL_KIND_NAMES[key]} 필요)` : toolWear(t, n.def.tier) === null ? ` (${TOOL_TIER_NAMES[Math.max(0, n.def.tier - 2)]} ${TOOL_KIND_NAMES[key]} 이상)` : '';
        const s = this.toScreen(n.x, n.def.style === 'tree' ? 3.6 : 2.2, n.z);
        labels.push({ text: `${n.def.name}${need}`, x: s.x, y: s.y, accent: !need });
      }
    }
    // 보관상자 위에 투입/출하 표시
    if (this.level instanceof HomeScene) {
      for (const b of this.factory.state.buildings) {
        if (b.type === 'box') {
          const s = this.toScreen((b.x + 0.5) * TILE, 1.9, (b.y + 0.5) * TILE);
          labels.push({ text: b.mode === 'in' ? ':crate_in: 투입' : ':crate_out: 출하', x: s.x, y: s.y, accent: b.mode !== 'in' });
        } else if (this.factory.missingInputs(b)) {
          const s = this.toScreen((b.x + 0.5) * TILE, 2.4, (b.y + 0.5) * TILE);
          const m = this.factory.missingInputs(b)!;
          labels.push({ text: `:warning: ${Object.keys(m.missing).map((id) => ITEMS[id].name).join('·')} 필요`, x: s.x, y: s.y, accent: true });
        } else if ((b.level ?? 1) > 1) {
          const s = this.toScreen((b.x + 0.5) * TILE, 0.3, (b.y + 0.5) * TILE);
          labels.push({ text: `Lv.${b.level}`, x: s.x, y: s.y, accent: true });
        }
      }
    }
    this.hud.setLabels(labels);
    if (this.level instanceof HomeScene) {
      this.hud.setBubbles(
        this.level.producing().map(({ b, x, z }) => {
          const s = this.toScreen(x, 2.6, z);
          const icon = b.type === 'workbench' ? workJobIconUrl(b.job!) : itemIconUrl(RECIPE_BY_ID[b.crafting!].output);
          return { x: s.x, y: s.y, icon, progress: b.progress ?? 0, onClick: () => this.openBuilding(b) };
        }),
      );
    } else this.hud.setBubbles([]);
  }

  /**
   * 회피 경로 판단 (몬스터·소품 같은 원형 장애물):
   * 회피 거리 안에 장애물을 완전히 빠져나갈 수 있고 내릴 자리가 바닥이면 통과, 가까이서 정면으로 막혀 못 넘으면 제자리 구르기.
   * 벽은 통과하지 않는다.
   */
  private planDodge(): void {
    const pl = this.player;
    const ds = pl.activeDash;
    if (!ds || ds.speed <= 0) return;
    const level = this.level;
    const obs = level instanceof DungeonScene ? level.playerObstacles() : level.obstacles;
    const r = PLAYER.radius;
    const L = ds.speed * ds.duration * (ds.pose === 'roll' ? 0.725 : 1);
    const px = pl.position.x;
    const pz = pl.position.z;
    let crossEnd = 0;
    let blockedNear = false;
    let any = false;
    for (const o of obs) {
      const R = r + o.radius;
      const ox = o.x - px;
      const oz = o.z - pz;
      const t0 = ox * ds.dirX + oz * ds.dirZ;
      const b = Math.abs(ox * ds.dirZ - oz * ds.dirX);
      if (b >= R) continue;
      const half = Math.sqrt(R * R - b * b);
      const enter = t0 - half;
      const exit = t0 + half;
      if (exit <= 0 || enter >= L) continue;
      any = true;
      // 허용 범위: 회피 거리 안에서 장애물 반대편으로 완전히 나갈 수 있는가
      if (exit <= L) crossEnd = Math.max(crossEnd, exit);
      else if (enter < L * 0.5) blockedNear = true;
    }
    if (!any) return;
    const floorAt = (x: number, z: number) => {
      for (const [ax, az] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (!isFloor(level.grid, Math.floor((x + ax) / TILE), Math.floor((z + az) / TILE))) return false;
      return true;
    };
    const freeAt = (x: number, z: number) => obs.every((o) => Math.hypot(o.x - x, o.z - z) >= r + o.radius);
    if (blockedNear) {
      // 넘을 수 없는 장애물이 코앞: 제자리에서 구른다
      ds.speed = 0;
      return;
    }
    if (crossEnd <= 0) return;
    // 가는 길에 벽이 있으면 통과하지 않고 원래대로
    for (let t = 0.2; t <= crossEnd; t += 0.2) if (!floorAt(px + ds.dirX * t, pz + ds.dirZ * t)) return;
    // 가장 먼 곳부터 장애물 너머의 내릴 자리(바닥이고 비어 있는 곳)를 찾는다
    for (let t = L; t >= crossEnd; t -= 0.15) {
      const ex = px + ds.dirX * t;
      const ez = pz + ds.dirZ * t;
      if (floorAt(ex, ez) && freeAt(ex, ez)) {
        ds.ghost = true;
        ds.speed *= t / L;
        return;
      }
    }
    // 내릴 자리가 없으면 제자리
    ds.speed = 0;
  }

  private floatRef: { x: number; y: number } | null = null;
  /** 조작 설정 화면 */
  private openControls(msg?: string): void {
    const c = this.input.controls;
    this.screens.controlsSettings(
      c,
      (nc) => {
        this.input.setControls(nc);
        saveControls(nc);
      },
      (cb) => (this.input.capture = cb),
      () => this.openPause(),
      () => {
        // 버튼 배치 편집: 게임은 멈춘 채 HUD 위에서 끌어서 옮긴다
        this.mode = 'menu';
        this.hud.setVisible(true);
        this.hud.editLayout(c.layout, (layout) => {
          this.hud.setVisible(false);
          c.layout = layout;
          saveControls(c);
          this.hud.applyLayout(layout);
          this.openControls('버튼 배치를 저장했습니다');
        });
      },
      msg,
    );
  }

  /** 집중형 각성: 모으는 중인 스킬 (slot -1 = 궁극기) */
  private charging: { slot: number; ult: boolean; index: number; t: number; fx: number } | null = null;

  private fireUlt(ui: number, charge: number): void {
    const msg = this.combat.useUlt(ui, this.progress.ultLevel(ui));
    if (msg) this.hud.toast(msg);
    else {
      this.gathering = null;
      this.hud.toast(`궁극기: ${ULTIMATES[this.progress.data.currentClass][ui].name}${charge > 0 ? ` (${Math.round(charge * 100)}%)` : ''}!`, 1400);
    }
  }

  /** 꾹 누르고 있는 동안 힘을 모으고, 떼면(또는 3초를 넘기면) 쏜다 */
  private updateCharging(dt: number): void {
    const c = this.charging!;
    const pl = this.player;
    const d = this.level instanceof DungeonScene ? this.level : null;
    if (!d || !pl.alive || pl.buff('stun') || pl.buff('silence')) {
      this.charging = null;
      return;
    }
    const before = c.t;
    c.t += dt;
    const k = Math.min(1, c.t / AWAKEN_HOLD);
    // 모으는 모습: 발밑 고리가 점점 커지고, 다 모이면 금빛으로 번쩍
    c.fx -= dt;
    if (c.fx <= 0) {
      c.fx = 0.22;
      const col = k >= 1 ? 0xffe08a : 0x9fd8ff;
      d.effects.ring(pl.position.x, pl.position.z, 0.8 + k * 1.8, col, 0.25, 0.8);
      d.effects.sparks(pl.position.x, 0.6, pl.position.z, col, 4 + Math.round(k * 8), { speed: 2 + k * 3, up: true, spread: 0.6 });
    }
    if (before < AWAKEN_HOLD && c.t >= AWAKEN_HOLD) {
      d.effects.ring(pl.position.x, pl.position.z, 2.8, 0xffe08a, 0.4, 1.2);
      this.audio.play('level');
    }
    const action = c.ult ? 'ult' : (`skill${c.slot + 1}` as 'skill1');
    if (this.input.held(action) && c.t < AWAKEN_HOLD + 0.6) return;
    this.charging = null;
    if (c.ult) this.fireUlt(c.index, 0);
    else {
      const msg = this.combat.useSkill(c.index, k);
      if (msg) this.hud.toast(msg);
      else this.gathering = null;
    }
  }

  /** 마우스 이동 목적지 */
  private mouseTarget: { x: number; z: number } | null = null;
  private mouseBest = Infinity;
  private mouseStuck = 0;
  private toScreen(x: number, y: number, z: number): { x: number; y: number } {
    const v = new Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.container.clientWidth, y: ((1 - v.y) / 2) * this.container.clientHeight };
  }

  private updateCamera(dt: number): void {
    let target: { x: number; z: number } = this.building && this.level instanceof HomeScene ? { x: this.level.center.x + this.buildPan.x, z: this.level.center.z + this.buildPan.z } : this.player.position;
    if (this.building && this.level instanceof HomeScene) {
      // 아래쪽 건설 도구줄에 가리지 않게 공장을 도구줄 높이의 절반만큼 위로 올려 보여 준다
      const barPx = this.buildBar.root.offsetHeight + 12;
      const a = this.toScreen(target.x, 0, target.z);
      const b = this.toScreen(target.x + SCREEN_UP.x, 0, target.z + SCREEN_UP.z);
      const pxPerUnit = Math.abs(a.y - b.y) || 1;
      const d = barPx / 2 / pxPerUnit;
      target = { x: target.x - SCREEN_UP.x * d, z: target.z - SCREEN_UP.z * d };
    }
    const k = 1 - Math.exp(-dt * 7);
    this.camTarget.x += (target.x - this.camTarget.x) * k;
    this.camTarget.z += (target.z - this.camTarget.z) * k;
    this.shakeT = Math.max(0, this.shakeT - dt);
    const s = this.shakeT * 0.7;
    const sx = (Math.random() - 0.5) * s;
    const sz = (Math.random() - 0.5) * s;
    this.camera.position.set(this.camTarget.x + CAMERA_OFFSET.x + sx, CAMERA_OFFSET.y, this.camTarget.z + CAMERA_OFFSET.z + sz);
    this.camera.lookAt(this.camTarget.x + sx, 0, this.camTarget.z + sz);
  }

  /** 끄는 동안 카메라를 바로 옮긴다 (한 박자 늦게 따라오지 않게) */
  private updateCameraNow(): void {
    this.camera.position.set(this.camTarget.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, this.camTarget.z + CAMERA_OFFSET.z);
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z);
    this.camera.updateMatrixWorld();
  }

  /** 개발용 (?debug): 현재 상태 */
  debugInfo(): Record<string, unknown> {
    return { mode: this.mode, level: this.level.kind, player: { ...this.player.position, hp: this.player.hp }, gold: this.progress.data.gold, stones: this.progress.data.dimStones, cleared: this.progress.data.cleared };
  }
}

/** 모바일에서 전체 화면 + 가로 고정을 시도한다 (지원하지 않는 브라우저는 조용히 넘어간다) */
function requestFullscreenLandscape(): void {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  el.requestFullscreen?.()
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => {});
}
