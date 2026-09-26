import { Vector3 } from 'three';

/** 한 타일의 월드 크기 */
export const TILE = 2;

/** 화면 세로에 보이는 월드 크기. 작을수록 캐릭터가 크게 보인다 */
export const VIEW_HEIGHT = 12;

/** 쿼터뷰 카메라 위치 (대상 기준). 수평 45°, 수직 약 40° */
export const CAMERA_OFFSET = new Vector3(20, 23.5, 20);

/** 화면 기준 방향을 월드 방향으로 바꾸는 벡터 (x, z) */
export const SCREEN_RIGHT = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
export const SCREEN_UP = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 };

export const WALL_HEIGHT = 1.5;

export const PLAYER = {
  radius: 0.45,
  walkSpeed: 6,
  rollSpeed: 13,
  rollTime: 0.38,
  rollCooldown: 0.7,
  /** 마법사 블링크: 거리와 재사용 대기 */
  blinkDist: 5.5,
  blinkCooldown: 1.3,
  /** 궁수 후방 도약 (회피 버튼) 재사용 대기 */
  backstepCooldown: 2.2,
  attackTime: 0.38,
  /** 휘두르기 시작 후 판정이 나오는 시점 (비율) */
  attackHitAt: 0.45,
  attackRange: 2.1,
  /** 자동 조준이 대상을 찾는 거리 */
  autoAimRange: 3.2,
  interactRange: 2.4,
};

export const BAG_SLOTS = 20;
export const STACK_SIZE = 50;

/** 화면에 보이는 게임 버전 (업데이트마다 올린다) */
export const GAME_VERSION = '10.3';
declare const __BUILD_ID__: string;
/** 빌드 번호 (테스트에서는 dev) */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
