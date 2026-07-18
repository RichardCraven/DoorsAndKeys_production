/**
 * AnimationManagerRedux
 *
 * A lightweight, Sandbox-style animation driver for combat-redux.
 * Unlike the legacy AnimationManager (tile IDs + canvas callbacks),
 * this class uses plain pixel math and emits React-state-compatible
 * event objects. MonsterBattle wires connect() and feeds the result
 * into CombatGrid as an `activeAnimations` prop.
 *
 * No canvas, no tile lookup, no update() callbacks.
 */

import {
  claw_strike_animation,
  claw_hit,
  induce_fear,
  energy_drain,
  heartbeat,
  perceive,
  monk_punch,
  monk_force_punch,
  ranger_net_throw,
  hex,
  shadow_presence,
  rake,
  gore_horns,
  demon_mark,
  new_moon,
  fear,
  soldier_fist_of_honor,
  death_missile,
  death_missile_hit
} from './images';

export class AnimationManagerRedux {
  constructor() {
    this.TILE_SIZE = 100;
    this.TILE_BORDER = 2; // added per-tile when SHOW_TILE_BORDERS=true
    this.USE_TILE_BORDERS = true;
    this.activeAnimations = [];
    this.onAnimationEvent = null; // callback(animations[]) wired by MonsterBattle
  }

  /** Wire the React setState callback from MonsterBattle */
  connect(callback) {
    this.onAnimationEvent = callback;
  }

  _px(coords, forceLarge = false, ignoreLarge = false) {
    if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') return { x: 0, y: 0 };
    const borderOffset = this.USE_TILE_BORDERS ? this.TILE_BORDER : 0;
    const yVal = this.isSiegeMode ? coords.y + 4 : coords.y;
    let x = coords.x * (this.TILE_SIZE + borderOffset) + this.TILE_SIZE / 2;
    let y = yVal * (this.TILE_SIZE + borderOffset) + this.TILE_SIZE / 2;
    const isLarge = !ignoreLarge && (forceLarge || (this._isTargetLarge && this._currentTargetCoords && coords.x === this._currentTargetCoords.x && coords.y === this._currentTargetCoords.y));
    if (isLarge) {
      // Anchor row y is the bottom row of the 2x2. Center is 50px up.
      y -= this.TILE_SIZE / 2;
      // Anchor col x is right if x >= 4 (center is 50px left), otherwise left (center is 50px right)
      if (coords.x >= 4) {
        x -= this.TILE_SIZE / 2;
      } else {
        x += this.TILE_SIZE / 2;
      }
    }
    return { x, y };
  }

  /** Emit an animation event and auto-remove it after duration */
  _emit(anim) {
    const id = `anim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const entry = { id, sourceUnitId: this._currentSourceUnitId, ...anim };
    this.activeAnimations = [...this.activeAnimations, entry];
    if (this.onAnimationEvent) this.onAnimationEvent([...this.activeAnimations]);

    const duration = anim.duration || 1000;
    setTimeout(() => {
      this.activeAnimations = this.activeAnimations.filter(a => a.id !== id);
      if (this.onAnimationEvent) this.onAnimationEvent([...this.activeAnimations]);
    }, duration);
  }

  /** Trigger a golden flash and rising "+20 POWER" text at specific grid coordinates */
  triggerPowerBoostPickup(coords) {
    if (!coords) return;
    const tgtPx = this._px(coords);
    this._emit({
      type: 'power_boost_pickup',
      tgtPx,
      duration: 1200
    });
  }

  /**
   * Main entry point — called by combat-manager-redux for every ability
   * @param {object} sourceCoords  { x, y }
   * @param {object} targetCoords  { x, y }
   * @param {string} abilityName   e.g. 'claw_strike', 'energy_drain'
   */
   triggerAbility(sourceCoords, targetCoords, abilityName, isTargetLarge = false, targetOccupiedCoords = null, sourceUnitId = null, arrowType = null, customDuration = null, hitResults = null, sphereCoords = null, negatedByBarrier = false, casterId = null) {
    if (!sourceCoords || !targetCoords) return;
    const name = String(abilityName || '').toLowerCase().replace(/\s+/g, '_');
    this._currentTargetCoords = targetCoords;
    this._isTargetLarge = isTargetLarge;
    this._currentTargetOccupiedCoords = Array.isArray(targetOccupiedCoords) ? targetOccupiedCoords : null;
    this._currentAbilityName = name;
    this._currentSourceUnitId = sourceUnitId || casterId;
    this._negatedByBarrier = negatedByBarrier;

    const spherePx = sphereCoords ? this._px(sphereCoords) : null;

    switch (name) {
      case 'betrayal_success':
        this._betrayalSuccess(targetCoords, sourceUnitId);
        break;
      case 'dominate_success':
        this._dominateSuccess(targetCoords, sourceUnitId, isTargetLarge, targetOccupiedCoords, casterId);
        break;
      case 'dominate_fail':
        this._dominateFail(targetCoords, sourceUnitId, isTargetLarge, targetOccupiedCoords, casterId);
        break;
      case 'overload_success': {
        const srcPx = this._px(sourceCoords);
        const tgtPx = this._getImpactTargetPx(targetCoords);
        const dx = tgtPx.x - srcPx.x;
        const dy = tgtPx.y - srcPx.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        this._emit({
          type: 'overload_projectile',
          srcPx,
          tgtPx,
          angle,
          duration: 700
        });
        setTimeout(() => {
          this._overloadSuccess(targetCoords, sourceUnitId, isTargetLarge, targetOccupiedCoords, casterId);
        }, 700);
        break;
      }
      case 'overload_fail': {
        const srcPx = this._px(sourceCoords);
        const tgtPx = this._getImpactTargetPx(targetCoords);
        const dx = tgtPx.x - srcPx.x;
        const dy = tgtPx.y - srcPx.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        this._emit({
          type: 'overload_projectile',
          srcPx,
          tgtPx,
          angle,
          duration: 700
        });
        setTimeout(() => {
          this._overloadFail(targetCoords, sourceUnitId, isTargetLarge, targetOccupiedCoords, casterId);
        }, 700);
        break;
      }
      case 'dragon_whirlwind':
        this._dragonWhirlwind(sourceCoords);
        break;
      case 'whirlwind':
      case 'monk_whirlwind':
      case 'barbarian_whirlwind':
        this._meleeWhirlwind(sourceCoords, sourceUnitId, name);
        break;
      case 'bombard':
        this._bombardEmission(sourceCoords, targetCoords, targetOccupiedCoords, sourceUnitId);
        break;
      case 'dragon_dispell':
        this._dragonDispell(sourceCoords, targetCoords);
        break;
      case 'fire_breath':
      case 'blue_dragon_breath':
        this._fireBreath(sourceCoords, targetCoords, customDuration || 1500);
        break;
      case 'claw_strike':
      case 'claws':
      case 'crush':
      case 'tackle':
      case 'grasp':
        this._clawStrike(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'undead_grasp':
        this._undeadGraspStrike(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'stomp':
        this._stomp(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'head_butt':
        this._headButt(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'bite':
      case 'gore':
        this._bite(sourceCoords, targetCoords);
        break;
      case 'energy_drain':
        this._energyDrain(sourceCoords, targetCoords);
        break;
      case 'induce_fear':
        this._induceFear(sourceCoords, targetCoords);
        break;
      case 'despair':
      case 'dispair':
        this._despair(sourceCoords, targetCoords);
        break;
      case 'void_rake':
      case 'rake':
        this._rakeStrike(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'gore_horns':
        this._goreHorns(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'silence':
        this._silenceProjectile(sourceCoords, targetCoords);
        break;
      case 'demon_mark':
        this._demonMarkOverlay(sourceCoords);
        break;
      case 'demon_mark_hit':
        this._demonMarkHit(sourceCoords, targetCoords);
        break;
      case 'new_moon':
        this._newMoonOverlay(sourceCoords);
        break;
      case 'malevolent_presence_fear':
        this._malevolentPresenceFear(sourceCoords, targetCoords);
        break;
      case 'fireball':
        this._fireball(sourceCoords, targetCoords, hitResults);
        break;
      case 'nether_bolt':
      case 'magic_missile':
      case 'minor_magic_missile':
      case 'major_magic_missile':
      case 'greater_magic_missile':
        this._magicMissile(sourceCoords, targetCoords, hitResults, name, spherePx);
        break;
      case 'lightning_strike':
      case 'lightning':
        this._lightning(sourceCoords, targetCoords);
        break;
      case 'ice_blast':
      case 'reveal_weakness':
        this._iceBlast(sourceCoords, targetCoords, hitResults);
        break;
      case 'acid_blast':
        this._acidBlast(sourceCoords, targetCoords, hitResults);
        break;
      case 'sword_swing':
      case 'slash':
      case 'barbarian_slash': {
        let facing = 'right';
        if (targetCoords.x === sourceCoords.x) {
          facing = targetCoords.y > sourceCoords.y ? 'down' : 'up';
        } else {
          facing = targetCoords.x > sourceCoords.x ? 'right' : 'left';
        }
        this._swordSlash(sourceCoords, targetCoords, sourceUnitId, facing);
        break;
      }
      case 'imbued_strike':
        this._imbuedStrike(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'fist_of_honor':
        this._fistOfHonor(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'shield_slam':
      case 'shield_bash':
        this._shieldSlam(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'shield_wall':
        this._shieldWall(sourceCoords);
        break;
      case 'cleave':
      case 'barbarian_cleave':
        this._barbarianCleave(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'monk_punch':
      case 'punch':
      case 'monk_force_punch':
      case 'force_punch':
      case 'monk_force_punch_flurry':
      case 'force_punch_flurry':
        this._monkPunch(sourceCoords, targetCoords, name);
        break;
      case 'annihilation':
        this._annihilation(sourceCoords, targetCoords);
        break;
      case 'sleep':
      case 'sleep_spell':
        this._sleep(sourceCoords, targetCoords);
        break;
      case 'vortex':
        this._vortex(sourceCoords, targetCoords);
        break;
      case 'monk_meditate':
      case 'meditate':
        this._monkMeditate(sourceCoords, targetCoords);
        break;
      case 'ensnare':
      case 'spiderweb':
        this._ensnareNet(sourceCoords, targetCoords);
        break;
      case 'spiderweb_detonation':
        this._emit({ type: 'spiderweb_detonation', tgtPx: this._getImpactTargetPx(targetCoords), duration: 500 });
        break;
      case 'axe_throw':
      case 'deadeye_shot':
      case 'spear_throw':
      case 'loose':
      case 'execute':
        this._projectileThrow(sourceCoords, targetCoords, name, arrowType, spherePx, sourceUnitId);
        break;
      case 'burst_shot':
      case 'burst_attack':
        this._executeMultiShots(sourceCoords, targetCoords, name, arrowType, spherePx);
        break;
      case 'circle_of_protection':
        this._circleOfProtection(sourceCoords, targetCoords);
        break;
      case 'circle_of_deflection':
        this._circleOfDeflection(sourceCoords, targetCoords);
        break;
      case 'invigorate':
        this._invigorateCircle(sourceCoords, targetCoords);
        break;
      case 'shadow_armor_dispel':
        this._shadowArmorDispel(sourceCoords, isTargetLarge, targetOccupiedCoords);
        break;
      case 'heal':
      case 'healing_hands':
      case 'healing_hands_type':
      case 'healing_hand':
      case 'healing_hymn':
      case 'regenerate':
        this._heal(sourceCoords, targetCoords);
        break;
      case 'direct_dispel':
        this._directDispel(sourceCoords, targetCoords);
        break;
      case 'vampiric_bite':
        this._vampiricBite(sourceCoords, targetCoords);
        break;
      case 'bat_fly':
        this._batFly(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'soul_suck':
        this._soulSuck(sourceCoords, targetCoords);
        break;
      case 'death_missile':
        this._deathMissile(sourceCoords, targetCoords);
        break;
      case 'bind':
        this._bindRopes(sourceCoords, targetCoords, isTargetLarge);
        break;
      case 'crimson_sight':
        this._crimsonSight(sourceCoords, targetCoords);
        break;
      case 'perceive':
        this._perceive(sourceCoords, targetCoords);
        break;
      case 'disintegrate':
        this._disintegrate(sourceCoords, targetCoords);
        break;
      case 'barbarian_berserker':
      case 'berserker':
        this._berserker(sourceCoords, targetCoords);
        break;
      case 'barbarian_leap_attack':
      case 'leap_attack':
      case 'leap':
        this._leapAttack(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'trials_beam':
        this._trialsBeam(sourceCoords, targetCoords);
        break;
      case 'rift':
        this._rift(sourceCoords, targetCoords, customDuration);
        break;
      case 'begin_the_trials':
        // Initial cast just spawns the Trial icon, no beam from Sphinx
        break;
      case 'hex':
        this._hex(sourceCoords, targetCoords);
        break;
      case 'shadow_curse':
        this._shadowCurse(sourceCoords, targetCoords);
        break;
      case 'madness_cast':
        this._madnessCast(sourceCoords, targetCoords);
        break;
      case 'madness_success':
        this._madnessSuccess(targetCoords, sourceUnitId, isTargetLarge, targetOccupiedCoords);
        break;
      case 'chainbolt':
        this._chainbolt(sourceCoords, targetCoords, sourceUnitId, customDuration);
        break;
      case 'mind_swap':
      case 'mind_swap_chain':
        this._mindSwapBeam(sourceCoords, targetCoords, name, customDuration);
        break;
      case 'displacement_ray':
        this._displacementRay(sourceCoords, targetCoords, customDuration);
        break;
      case 'invisibility':
        this._beholderInvisibility(sourceCoords, sourceUnitId);
        break;
      case 'voidbite':
        this._voidbite(sourceCoords, targetCoords, sourceUnitId);
        break;
      case 'eldritch_wind':
        this._eldritchWind(sourceCoords);
        break;
      case 'paradox_engine_success':
        this._paradoxEngineSuccess(sourceCoords, targetCoords);
        break;
      case 'paradox_engine_fail':
        this._paradoxEngineFail(sourceCoords, targetCoords);
        break;
      default:
        // Generic melee hit for unknown abilities
        this._genericHit(sourceCoords, targetCoords);
        break;
    }
  }

  _isProjectileAbility(name) {
    return [
      'axe_throw',
      'deadeye_shot',
      'spear_throw',
      'loose',
      'execute',
      'burst_shot',
      'burst_attack',
      'energy_drain',
      'fireball',
      'magic_missile',
      'ice_blast',
      'reveal_weakness',
      'disintegrate',
      'death_missile',
    ].includes(name);
  }

  _getLargeTargetCenterPx() {
    if (!this._isTargetLarge) return null;
    const tiles = this._currentTargetOccupiedCoords;
    if (Array.isArray(tiles) && tiles.length > 0) {
      const sum = tiles.reduce((acc, tile) => {
        if (!tile || typeof tile.x !== 'number' || typeof tile.y !== 'number') return acc;
        return { x: acc.x + tile.x, y: acc.y + tile.y, n: acc.n + 1 };
      }, { x: 0, y: 0, n: 0 });
      if (sum.n > 0) {
        return this._px({ x: sum.x / sum.n, y: sum.y / sum.n }, false, true);
      }
    }
    return this._px(this._currentTargetCoords);
  }

  _getImpactTargetPx(tgt) {
    if (this._isTargetLarge) {
      return this._getLargeTargetCenterPx();
    }
    return this._px(tgt);
  }

  _adjustTgtPxForArcaneBarrier(srcPx, tgtPx) {
    if (!this._negatedByBarrier || !srcPx || !tgtPx) return tgtPx;
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 0) return tgtPx;
    const ux = dx / dist;
    const uy = dy / dist;
    
    let R = 58.5;
    if (this._isTargetLarge) {
      const occupiedLength = Array.isArray(this._currentTargetOccupiedCoords) ? this._currentTargetOccupiedCoords.length : 0;
      if (occupiedLength >= 9) {
        R = 175.5;
      } else {
        R = 117;
      }
    }
    
    return {
      x: tgtPx.x - R * ux,
      y: tgtPx.y - R * uy
    };
  }

  _betrayalSuccess(targetCoords, targetUnitId) {
    const tgtPx = this._px(targetCoords);
    this._emit({
      type: 'betrayal_success_overlay',
      tgtPx,
      targetUnitId,
      duration: 1200
    });
  }

  _dominateSuccess(targetCoords, targetUnitId, isTargetLarge, targetOccupiedCoords, casterId = null) {
    const tgtPx = this._px(targetCoords, isTargetLarge);
    this._emit({
      type: 'dominate_success_overlay',
      tgtPx,
      targetUnitId,
      isTargetLarge,
      targetOccupiedCoords,
      duration: 2000,
      casterId
    });
  }

  _dominateFail(targetCoords, targetUnitId, isTargetLarge, targetOccupiedCoords, casterId = null) {
    const tgtPx = this._px(targetCoords, isTargetLarge);
    this._emit({
      type: 'dominate_fail_overlay',
      tgtPx,
      targetUnitId,
      isTargetLarge,
      targetOccupiedCoords,
      duration: 1500,
      casterId
    });
  }

  _overloadSuccess(targetCoords, targetUnitId, isTargetLarge, targetOccupiedCoords, casterId = null) {
    const tgtPx = this._px(targetCoords, isTargetLarge);
    this._emit({
      type: 'overload_success_overlay',
      tgtPx,
      targetUnitId,
      isTargetLarge,
      targetOccupiedCoords,
      duration: 1800,
      casterId: casterId || targetUnitId
    });
  }

  _overloadFail(targetCoords, targetUnitId, isTargetLarge, targetOccupiedCoords, casterId = null) {
    const tgtPx = this._px(targetCoords, isTargetLarge);
    this._emit({
      type: 'overload_fail_overlay',
      tgtPx,
      targetUnitId,
      isTargetLarge,
      targetOccupiedCoords,
      duration: 1000,
      casterId: casterId || targetUnitId
    });
  }

  // ── Madness animations ──────────────────────────────────────────────────────
  _madnessCast(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Phase 1: Spiraling psychic orb projectile traveling to target center
    this._emit({
      type: 'madness_projectile',
      srcPx,
      tgtPx,
      angle,
      duration: 650
    });

    // Phase 2: Area fracture burst at the 2x2 center
    setTimeout(() => {
      this._emit({
        type: 'madness_cast_overlay',
        tgtPx,
        duration: 1600
      });
    }, 550);
  }

  _madnessSuccess(targetCoords, targetUnitId, isTargetLarge, targetOccupiedCoords) {
    const tgtPx = this._px(targetCoords, isTargetLarge);
    this._emit({
      type: 'madness_success_overlay',
      tgtPx,
      targetUnitId,
      isTargetLarge,
      targetOccupiedCoords,
      duration: 1800
    });
  }

  // ─── Animation implementations ───────────────────────────────────────────────

  _clawStrike(src, tgt, sourceUnitId = null) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    // Place swipe icon halfway between attacker and target
    const midPx = { x: srcPx.x + dx * 0.6, y: srcPx.y + dy * 0.6 };
    const angle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 180;

    // Phase 1: claw swipe arc traveling toward target
    this._emit({
      type: 'claw_swipe',
      srcPx,
      tgtPx,
      midPx,
      angle,
      icon: claw_strike_animation,
      duration: 750,
      sourceUnitId,
    });

    // Phase 2: claw_hit overlay on target, staggered after swipe
    setTimeout(() => {
      this._emit({
        type: 'claw_hit',
        tgtPx,
        icon: claw_hit,
        duration: 400,
        sourceUnitId,
      });
    }, 500);
  }

  _undeadGraspStrike(src, tgt, sourceUnitId = null) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    // Place swipe icon halfway between attacker and target
    const midPx = { x: srcPx.x + dx * 0.6, y: srcPx.y + dy * 0.6 };
    const angle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 180;

    // Phase 1: undead grasp swipe arc (purple hue-rotated) traveling toward target
    this._emit({
      type: 'undead_grasp_swipe',
      srcPx,
      tgtPx,
      midPx,
      angle,
      icon: claw_strike_animation,
      duration: 750,
      sourceUnitId,
    });

    // Phase 2: claw_hit overlay on target, staggered after swipe
    setTimeout(() => {
      this._emit({
        type: 'claw_hit',
        tgtPx,
        icon: claw_hit,
        duration: 400,
        sourceUnitId,
      });
    }, 450);
  }

  _stomp(src, tgt, sourceUnitId) {
    const srcPx = this._px(src);
    this._emit({
      type: 'stomp_cast',
      sourceUnitId,
      duration: 1000
    });

    setTimeout(() => {
      this._emit({
        type: 'stomp_shockwave',
        centerPx: srcPx,
        duration: 600
      });
    }, 450);
  }

  _headButt(src, tgt, sourceUnitId) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'head_butt_lunge',
      srcPx,
      tgtPx,
      srcCoords: src,
      tgtCoords: tgt,
      sourceUnitId,
      duration: 1000
    });
  }

  _bite(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'bite_chomping',
      srcPx: this._px(src),
      tgtPx,
      duration: 1000
    });
  }

  _energyDrain(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._getImpactTargetPx(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'energy_drain_beam',
      srcPx,
      tgtPx,
      length,
      angle,
      icon: energy_drain,
      duration: 1500,
    });
  }

  _induceFear(src, tgt) {
    this._emit({
      type: 'induce_fear_overlay',
      srcPx: this._px(src),
      tgtPx: tgt ? this._px(tgt) : null,
      icon: induce_fear,
      duration: 1500,
    });
  }

  _despair(src, _tgt) {
    this._emit({
      type: 'despair_overlay',
      srcPx: this._px(src),
      icon: shadow_presence,
      duration: 1500,
    });
  }

  _fireball(src, tgt, hitResults = null) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'fireball_projectile',
      srcPx,
      tgtPx,
      angle,
      duration: 1000,
    });
    const didHit = !Array.isArray(hitResults) || hitResults.length === 0 || hitResults[0] === true;
    if (!this._negatedByBarrier) {
      if (didHit) {
        setTimeout(() => {
          this._emit({ type: 'explosion', tgtPx, duration: 600 });
        }, 900);
        setTimeout(() => {
          this._emit({ type: 'fire_secondary_ring', tgtPx, duration: 500 });
        }, 980);
      } else {
        setTimeout(() => {
          this._emit({ type: 'projectile_drip', tgtPx, variant: 'fireball', duration: 1000 });
        }, 900);
      }
    }
  }

  _magicMissile(src, tgt, hitResults = null, abilityName = 'magic_missile', spherePx = null) {
    const srcPx = this._px(src);
    const occupiedCoords = this._currentTargetOccupiedCoords;
    const hasComplex = Array.isArray(occupiedCoords) && occupiedCoords.length > 0;

    const fireMissile = (delayTime, offsetY, index) => {
      setTimeout(() => {
        let currentTgtPx;
        if (hasComplex && occupiedCoords) {
          const randomIndex = Math.floor(Math.random() * occupiedCoords.length);
          const randomTile = occupiedCoords[randomIndex];
          currentTgtPx = this._px(randomTile, false, true);
        } else {
          currentTgtPx = this._getImpactTargetPx(tgt);
        }

        const finalTgtPx = {
          x: currentTgtPx.x,
          y: currentTgtPx.y + offsetY
        };
        const adjustedTgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, finalTgtPx);
        const dx = adjustedTgtPx.x - srcPx.x;
        const dy = adjustedTgtPx.y - srcPx.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        this._emit({
          type: 'magic_missile_projectile',
          srcPx,
          tgtPx: adjustedTgtPx,
          angle,
          duration: 400,
          spherePx,
          abilityName,
        });

        const isHit = Array.isArray(hitResults) ? hitResults[index] !== false : true;

        // Emit hit sigil at impact (400ms later)
        setTimeout(() => {
          if (isHit && !this._negatedByBarrier) {
            this._emit({
              type: 'magic_missile_hit_sigil',
              tgtPx: adjustedTgtPx,
              duration: 350
            });
          } else {
            this._emit({
              type: 'magic_missile_miss_dot',
              tgtPx: finalTgtPx,
              duration: 350
            });
          }
        }, 400);
      }, delayTime);
    };

    if (abilityName === 'greater_magic_missile') {
      fireMissile(0, -20, 0);
      fireMissile(150, -10, 1);
      fireMissile(300, 0, 2);
      fireMissile(450, 10, 3);
      fireMissile(600, 20, 4);
    } else if (abilityName === 'nether_bolt' || abilityName === 'minor_magic_missile') {
      fireMissile(0, 0, 0);
    } else {
      fireMissile(0, -15, 0);
      fireMissile(200, 0, 1);
      fireMissile(400, 15, 2);
    }
  }

  _lightning(src, tgt) {
    const tgtPx = this._getImpactTargetPx(tgt);
    // Emit lightning vertical beam
    this._emit({
      type: 'lightning_beam',
      tgtPx,
      duration: 700
    });
    // Emit lightning hit burst (or background flash overlays)
    setTimeout(() => {
      this._emit({
        type: 'lightning_hit',
        tgtPx,
        duration: 400
      });
    }, 150);
  }

  _iceBlast(src, tgt, hitResults = null) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'ice_projectile',
      srcPx,
      tgtPx,
      angle,
      duration: 700,
    });
    const didHit = !Array.isArray(hitResults) || hitResults.length === 0 || hitResults[0] === true;
    if (!this._negatedByBarrier) {
      if (didHit) {
        setTimeout(() => {
          this._emit({ type: 'ice_burst', tgtPx, duration: 500 });
        }, 600);
      } else {
        setTimeout(() => {
          this._emit({ type: 'projectile_drip', tgtPx, variant: 'ice_blast', duration: 1000 });
        }, 600);
      }
    }
  }

  _acidBlast(src, tgt, hitResults = null) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'acid_projectile',
      srcPx,
      tgtPx,
      angle,
      duration: 700,
    });

    const isHit = Array.isArray(hitResults) ? hitResults[0] !== false : (hitResults !== false);

    if (!this._negatedByBarrier) {
      if (isHit) {
        setTimeout(() => {
          this._emit({ type: 'poison_burst', tgtPx, duration: 500 });
        }, 600);
        setTimeout(() => {
          this._emit({ type: 'acid_secondary_ring', tgtPx, duration: 450 });
        }, 690);
      } else {
        setTimeout(() => {
          this._emit({ type: 'projectile_drip', tgtPx, variant: 'acid_blast', duration: 1000 });
        }, 600);
      }
    }
  }

  _swordSlash(src, tgt, sourceUnitId = null, facing = 'right') {
    let targetCoords = tgt;
    if (this._isTargetLarge && Array.isArray(this._currentTargetOccupiedCoords) && this._currentTargetOccupiedCoords.length > 0) {
      let minDist = Infinity;
      this._currentTargetOccupiedCoords.forEach(tc => {
        const dist = Math.abs(src.x - tc.x) + Math.abs(src.y - tc.y);
        if (dist < minDist) {
          minDist = dist;
          targetCoords = tc;
        }
      });
    }

    const srcPx = this._px(src);
    const tgtPx = this._px(targetCoords, false, true);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'sword_slash',
      srcPx,
      tgtPx,
      angle,
      duration: 600,
      sourceUnitId,
      facing,
    });
  }

  _imbuedStrike(src, tgt, sourceUnitId) {
    let targetCoords = tgt;
    if (this._isTargetLarge && Array.isArray(this._currentTargetOccupiedCoords) && this._currentTargetOccupiedCoords.length > 0) {
      let minDist = Infinity;
      this._currentTargetOccupiedCoords.forEach(tc => {
        const dist = Math.abs(src.x - tc.x) + Math.abs(src.y - tc.y);
        if (dist < minDist) {
          minDist = dist;
          targetCoords = tc;
        }
      });
    }

    const srcPx = this._px(src);
    const tgtPx = this._px(targetCoords, false, true);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'imbued_strike',
      srcPx,
      tgtPx,
      angle,
      duration: 1000,
      sourceUnitId,
    });
  }

  _fistOfHonor(src, tgt, sourceUnitId = null) {
    let targetCoords = tgt;
    if (this._isTargetLarge && Array.isArray(this._currentTargetOccupiedCoords) && this._currentTargetOccupiedCoords.length > 0) {
      let minDist = Infinity;
      this._currentTargetOccupiedCoords.forEach(tc => {
        const dist = Math.abs(src.x - tc.x) + Math.abs(src.y - tc.y);
        if (dist < minDist) {
          minDist = dist;
          targetCoords = tc;
        }
      });
    }

    const srcPx = this._px(src);
    const tgtPx = this._px(targetCoords, false, true);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const leftOffset = (srcPx.x - tgtPx.x) / 2;
    const topOffset = (srcPx.y - tgtPx.y) / 2;
    const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    this._emit({
      type: 'fist_of_honor_effect',
      srcPx,
      tgtPx,
      leftOffset,
      topOffset,
      baseAngle,
      icon: soldier_fist_of_honor,
      duration: 800,
      sourceUnitId,
    });
  }

  _projectileThrow(src, tgt, name, arrowType = null, spherePx = null, sourceUnitId = null) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const activeArrow = arrowType || 'force';
    this._emit({
      type: 'generic_projectile',
      subtype: name,
      srcPx,
      tgtPx,
      angle,
      arrowType: activeArrow,
      duration: 700,
      spherePx,
      sourceUnitId,
    });
    if (activeArrow === 'ice') {
      setTimeout(() => {
        this._emit({ type: 'ice_burst', tgtPx, duration: 500 });
      }, 600);
    } else if (activeArrow === 'poison') {
      setTimeout(() => {
        this._emit({ type: 'poison_burst', tgtPx, duration: 500 });
      }, 600);
    } else if (activeArrow === 'force') {
      setTimeout(() => {
        this._emit({ type: 'force_burst', tgtPx, duration: 500 });
      }, 600);
    }
  }

  _ensnareNet(src, tgt) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'generic_projectile',
      subtype: 'ensnare_net',
      srcPx,
      tgtPx,
      angle,
      isNet: true,
      netIcon: ranger_net_throw,
      duration: 1200,
    });
  }

  _executeMultiShots(src, tgt, name, arrowType = null, spherePx = null) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const activeArrow = arrowType || 'force';

    const fireArrow = () => {
      this._emit({
        type: 'generic_projectile',
        subtype: name,
        srcPx,
        tgtPx,
        angle,
        arrowType: activeArrow,
        duration: 700,
        spherePx,
      });
      if (activeArrow === 'ice') {
        setTimeout(() => {
          this._emit({ type: 'ice_burst', tgtPx, duration: 500 });
        }, 600);
      } else if (activeArrow === 'poison') {
        setTimeout(() => {
          this._emit({ type: 'poison_burst', tgtPx, duration: 500 });
        }, 600);
      } else if (activeArrow === 'force') {
        setTimeout(() => {
          this._emit({ type: 'force_burst', tgtPx, duration: 500 });
        }, 600);
      }
    };

    fireArrow();
    setTimeout(fireArrow, 250);
    setTimeout(fireArrow, 500);
  }

  _heal(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.sqrt(dx * dx + dy * dy);
    const duration = 1000;

    // Emit the glowing particle beam connecting healer to healed unit
    this._emit({
      type: 'healing_beam',
      srcPx,
      tgtPx,
      angle,
      length,
      duration: duration,
    });

    // Impact pop target heal glow at 400ms delay
    setTimeout(() => {
      this._emit({
        type: 'heal_glow',
        srcPx,
        tgtPx,
        duration: 800,
      });
    }, 400);
  }

  _directDispel(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'direct_dispel_glow',
      srcPx: this._px(src),
      tgtPx,
      duration: 800,
    });
  }

  _circleOfProtection(src, tgt) {
    const srcPx = this._px(src);
    this._emit({
      type: 'circle_of_protection',
      srcPx,
      duration: 8000,
    });
  }

  _circleOfDeflection(src, tgt) {
    const srcPx = this._px(src);
    this._emit({
      type: 'circle_of_deflection',
      srcPx,
      duration: 8000,
    });
  }

  _invigorateCircle(src, tgt) {
    const srcPx = this._px(src);
    this._emit({
      type: 'invigorate',
      srcPx,
      duration: 8000,
    });
  }

  _shadowArmorDispel(src, isLarge = false, occupiedCoords = null) {
    let centerPx;
    const tiles = Array.isArray(occupiedCoords) ? occupiedCoords : this._currentTargetOccupiedCoords;
    const large = isLarge || this._isTargetLarge;

    if (large && Array.isArray(tiles) && tiles.length > 0) {
      const sum = tiles.reduce((acc, tile) => {
        if (!tile || typeof tile.x !== 'number' || typeof tile.y !== 'number') return acc;
        return { x: acc.x + tile.x, y: acc.y + tile.y, n: acc.n + 1 };
      }, { x: 0, y: 0, n: 0 });
      if (sum.n > 0) {
        centerPx = this._px({ x: sum.x / sum.n, y: sum.y / sum.n }, false, true);
      }
    }

    if (!centerPx) {
      centerPx = this._px(src, large);
    }

    this._emit({
      type: 'dragon_dispel_wave',
      centerPx,
      duration: 1500,
    });
  }

  _genericHit(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'generic_hit',
      tgtPx,
      duration: 400,
    });
  }

  _crimsonSight(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'crimson_sight_anim',
      srcPx: this._px(src),
      tgtPx,
      icon: heartbeat,
      duration: 1500,
    });
  }

  _perceive(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'perceive_anim',
      srcPx: this._px(src),
      tgtPx,
      icon: perceive,
      duration: 1500,
    });
  }

  _barbarianCleave(src, tgt, sourceUnitId) {
    let targetCoords = tgt;
    if (this._isTargetLarge && Array.isArray(this._currentTargetOccupiedCoords) && this._currentTargetOccupiedCoords.length > 0) {
      let minDist = Infinity;
      this._currentTargetOccupiedCoords.forEach(tc => {
        const dist = Math.abs(src.x - tc.x) + Math.abs(src.y - tc.y);
        if (dist < minDist) {
          minDist = dist;
          targetCoords = tc;
        }
      });
    }

    const srcPx = this._px(src);
    const tgtPx = this._px(targetCoords, false, true);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    const halfDistPx = Math.sqrt(dx * dx + dy * dy) / 2;
    const leftOffset = (srcPx.x - tgtPx.x) / 2;
    const topOffset = (srcPx.y - tgtPx.y) / 2;

    this._emit({
      type: 'barbarian_cleave_effect',
      sourceUnitId,
      srcPx,
      tgtPx,
      baseAngle,
      halfDistPx,
      leftOffset,
      topOffset,
      duration: 1100
    });
  }

  _monkPunch(src, tgt, name) {
    let targetCoords = tgt;
    if (this._isTargetLarge && Array.isArray(this._currentTargetOccupiedCoords) && this._currentTargetOccupiedCoords.length > 0) {
      let minDist = Infinity;
      this._currentTargetOccupiedCoords.forEach(tc => {
        const dist = Math.abs(src.x - tc.x) + Math.abs(src.y - tc.y);
        if (dist < minDist) {
          minDist = dist;
          targetCoords = tc;
        }
      });
    }

    const srcPx = this._px(src);
    const tgtPx = this._px(targetCoords, false, true);
    const leftOffset = (srcPx.x - tgtPx.x) / 2;
    const topOffset = (srcPx.y - tgtPx.y) / 2;

    const isForce = name.includes('force');
    const punchIcon = isForce ? monk_force_punch : monk_punch;

    this._emit({
      type: isForce ? 'monk_force_punch_effect' : 'monk_punch_effect',
      srcPx,
      tgtPx,
      leftOffset,
      topOffset,
      icon: punchIcon,
      facing: src.x > targetCoords.x ? 'left' : 'right',
      duration: 500
    });
  }

  _annihilation(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._isTargetLarge ? (this._getLargeTargetCenterPx() || this._px(tgt)) : this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Phase 1: Annihilation horizontal beam sweeps target
    this._emit({
      type: 'annihilation_beam',
      srcPx,
      tgtPx,
      length,
      angle,
      duration: 1200
    });

    // Phase 2: Concentric ring explosion on target (triggers at 150ms when beam makes contact)
    setTimeout(() => {
      this._emit({
        type: 'annihilation_burst',
        tgtPx,
        duration: 700
      });
    }, 150);

    // Phase 3: Hit effect annihilation_portal on target (triggers at 150ms when beam makes contact)
    setTimeout(() => {
      this._emit({
        type: 'annihilation_portal',
        tgtPx,
        duration: 1200
      });
    }, 150);
  }

  _sleep(src, tgt) {
    const tgtPx = this._getImpactTargetPx(tgt);
    this._emit({
      type: 'sleep_rings',
      tgtPx,
      duration: 1500
    });
  }

  _vortex(src, tgt) {
    const tgtPx = this._getImpactTargetPx(tgt);
    this._emit({
      type: 'vortex',
      tgtPx,
      duration: 4000
    });
  }

  _monkMeditate(src) {
    const srcPx = this._px(src);
    this._emit({
      type: 'monk_meditate',
      srcPx,
      duration: 1800
    });
  }

  _shieldSlam(src, tgt, sourceUnitId) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'shield_slam_connect',
      srcPx,
      tgtPx,
      srcCoords: src,
      tgtCoords: tgt,
      sourceUnitId,
      duration: 600,
    });
  }

  _shieldWall(src) {
    const srcPx = this._px(src);
    this._emit({
      type: 'shield_wall',
      srcPx,
      duration: 1500
    });
  }

  _disintegrate(src, tgt) {
    const tgtPx = this._getImpactTargetPx(tgt);
    this._emit({
      type: 'disintegrate_beam',
      tgtPx,
      duration: 2200
    });
  }

  triggerSummon(coords, summonType, transitionIcon) {
    this._summon(coords, summonType, transitionIcon);
  }

  _summon(tgt, summonType, transitionIcon) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'summon_portal',
      tgtPx,
      summonType,
      icon: transitionIcon,
      duration: 1200
    });
  }

  _berserker(src, tgt) {
    const srcPx = this._px(src);
    this._emit({
      type: 'berserker_rage',
      srcPx,
      duration: 1000
    });
  }

  _leapAttack(src, tgt, sourceUnitId = null) {
    const srcPx = this._px(src, false, true);
    const tgtPx = this._px(tgt, false, true);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    this._emit({
      type: 'leap_attack_jump',
      sourceUnitId,
      srcPx,
      tgtPx,
      dx,
      dy,
      duration: 600
    });
  }

  _vampiricBite(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'vampiric_bite_chomping',
      srcPx: this._px(src),
      tgtPx,
      duration: 1000
    });
  }

  _batFly(src, tgt, sourceUnitId = null) {
    const isLarge = this._isTargetLarge;
    const srcPx = this._px(src, isLarge);
    const tgtPx = this._px(tgt, isLarge);
    this._emit({
      type: 'bat_fly_anim',
      srcPx,
      tgtPx,
      sourceUnitId,
      duration: 1200
    });
  }

  _soulSuck(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'soul_suck_beam',
      srcPx,
      tgtPx,
      duration: 1000
    });
  }

  _bindRopes(src, tgt, isTargetLarge = false) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt, isTargetLarge);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    this._emit({
      type: 'bind_beam',
      srcPx,
      tgtPx,
      length,
      angle,
      duration: 600
    });

    setTimeout(() => {
      this._emit({
        type: 'bind_hit_ropes',
        tgtPx,
        tgt,
        isTargetLarge,
        duration: 1500
      });
    }, 500);
  }

  _deathMissile(src, tgt) {
    const srcPx = this._px(src);
    let tgtPx = this._getImpactTargetPx(tgt);
    tgtPx = this._adjustTgtPxForArcaneBarrier(srcPx, tgtPx);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    this._emit({
      type: 'generic_projectile',
      subtype: 'death_missile',
      srcPx,
      tgtPx,
      angle,
      projectileIcon: death_missile,
      duration: 800,
    });

    setTimeout(() => {
      this._emit({
        type: 'death_missile_burst',
        tgtPx,
        icon: death_missile_hit,
        duration: 500,
      });
    }, 700);
  }

  /** Trials beam — purple beam from source (trials icon position) to target fighter */
  _trialsBeam(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Phase 1: purple beam from trials icon to fighter
    this._emit({
      type: 'trials_beam',
      srcPx,
      tgtPx,
      length,
      angle,
      duration: 1000
    });

    // Phase 2: Burst on target
    setTimeout(() => {
      this._emit({
        type: 'trials_burst',
        tgtPx,
        duration: 700
      });
    }, 800);
  }

  /**
   * Trigger the Djinn's Rift skill:
   * Phase 1 – a jagged vertical energy line materialises 1 tile in front of the Djinn.
   * Phase 2 – after 1 round (~roundDurationMs), the line sweeps 2 tile-widths forward.
   * @param {object} sourceCoords  Djinn's grid coordinates { x, y }
   * @param {object} riftSpawnCoords  1 tile in front of Djinn { x, y }
   */
  _rift(sourceCoords, riftSpawnCoords, roundDurationMs) {
    const dur = roundDurationMs || 2000;
    const spawnPx = this._px(riftSpawnCoords || {
      x: sourceCoords.x,
      y: sourceCoords.y
    });

    // Phase 1: the line appears
    this._emit({
      type: 'rift_line_appear',
      spawnPx,
      tileSize: this.TILE_SIZE,
      duration: Math.round(dur * 0.9),  // stays visible until sweep
    });

    // Phase 2: sweep 2 tile-widths toward enemies (to the left, same as forwardDir = -1 for monsters)
    const sweepDelay = Math.round(dur * 0.8);
    const sweepDuration = Math.round(dur * 0.25);
    setTimeout(() => {
      this._emit({
        type: 'rift_line_sweep',
        spawnPx,
        tileSize: this.TILE_SIZE,
        sweepDistancePx: this.TILE_SIZE * 2,
        duration: sweepDuration,
      });
    }, sweepDelay);
  }

  /**
   * Emit a rift_pushback overlay for a single unit being pushed by the Djinn's rift.
   * CombatGrid reads this to apply a fast, sweep-matched CSS transition instead of
   * the default 1000ms spring, so the portrait slides smoothly with the sweeping line.
   * @param {string} unitId         The combatant id being pushed
   * @param {number} durationMs     Sweep duration in ms (so tile transition matches exactly)
   */
  triggerRiftPushback(unitId, durationMs) {
    this._emit({
      type: 'rift_pushback',
      sourceUnitId: unitId,
      duration: durationMs || 500,
    });
  }

  triggerTrialIconAppear(sphinxCoords) {
    const srcPx = this._px(sphinxCoords);
    // Place icon above sphinx's top row (offset by -TILE_SIZE * 1.5 in y)
    const iconPx = {
      x: srcPx.x,
      y: srcPx.y - this.TILE_SIZE * 1.5
    };
    this._emit({
      type: 'trials_icon_appear',
      srcPx: iconPx,
      duration: 900
    });
  }

  /** Trigger a burst when the trial effect icon is destroyed */
  triggerTrialIconDestroy(iconCoords) {
    const srcPx = this._px(iconCoords);
    const iconPx = {
      x: srcPx.x,
      y: srcPx.y - this.TILE_SIZE * 1.5
    };
    this._emit({
      type: 'trials_icon_destroy',
      srcPx: iconPx,
      duration: 800
    });
  }

  /**
   * Trigger the return-from-trial overlay on a fighter's tile.
   * @param {object} fighterCoords  { x, y }
   * @param {number} trialIndex     0, 1, or 2
   */
  triggerReturnFromTrial(fighterCoords, trialIndex, sourceUnitId = null) {
    const tgtPx = this._px(fighterCoords);
    this._emit({
      type: 'return_from_trial',
      tgtPx,
      trialIndex,
      sourceUnitId,
      duration: 2500
    });
  }

  _hex(src, tgt) {
    const tgtPx = this._getImpactTargetPx(tgt);
    this._emit({
      type: 'hex_overlay',
      tgtPx,
      icon: hex,
      duration: 1500,
    });
  }

  _shadowCurse(src, tgt) {
    const tgtPx = this._getImpactTargetPx(tgt);
    this._emit({
      type: 'shadow_curse_rings',
      tgtPx,
      duration: 1500,
    });
  }

  _getHugeCenterPx(coords) {
    if (!coords) return { x: 0, y: 0 };
    const hOffset = (coords.x >= 4) ? -1 : 1;
    const centerCol = coords.x + hOffset;
    const centerRow = coords.y - 1;
    return this._px({ x: centerCol, y: centerRow });
  }

  _dragonWhirlwind(sourceCoords) {
    const centerPx = this._getHugeCenterPx(sourceCoords);
    this._emit({
      type: 'dragon_whirlwind_effect',
      centerPx,
      duration: 1500
    });
  }

  _meleeWhirlwind(sourceCoords, sourceUnitId, abilityName) {
    const centerPx = this._px(sourceCoords);
    this._emit({
      type: 'melee_whirlwind_effect',
      centerPx,
      sourceUnitId,
      abilityName,
      duration: 1000
    });
  }

  _bombardEmission(sourceCoords, targetCoords, targetOccupiedCoords, casterId = null) {
    const centerPx = this._getHugeCenterPx(sourceCoords);
    const warningTilePxs = (targetOccupiedCoords || [targetCoords]).map(tc => this._px(tc));
    this._emit({
      type: 'bombard_emission',
      centerPx,
      warningTilePxs,
      duration: 1500,
      casterId
    });
  }

  triggerBombardStrike(targetCoords, isMeteors = false, casterId = null) {
    if (!Array.isArray(targetCoords)) return;
    const strikeTilePxs = targetCoords.map(tc => this._px(tc));

    // Generate 10 random beams for each targeted tile
    const generateRandomBeams = () => {
      return [...Array(10)].map((_, i) => {
        const isSet2 = i >= 5;
        const baseDelay = isSet2 ? 0.35 : 0.0;
        const delay = parseFloat((baseDelay + Math.random() * 0.35).toFixed(3));
        const width = Math.floor(Math.random() * 13) + 7;
        // Random offsets in pixels (-30px to +30px)
        const left = Math.floor(Math.random() * 61) - 30;
        const top = Math.floor(Math.random() * 61) - 30;
        const glowColor = isMeteors 
          ? (Math.random() > 0.5 ? '#ff4500' : '#ffffff') 
          : (Math.random() > 0.5 ? '#00ffff' : '#00bfff');
        return { delay, width, left, top, glowColor };
      });
    };

    const barrages = strikeTilePxs.map(tilePx => ({
      tilePx,
      beams: generateRandomBeams()
    }));

    this._emit({
      type: 'bombard_strike',
      barrages,
      duration: 1500,
      isMeteors,
      casterId
    });
  }

  _dragonDispell(sourceCoords, targetCoords) {
    const centerPx = this._getHugeCenterPx(sourceCoords);
    const targetPx = this._px(targetCoords);
    this._emit({
      type: 'dragon_dispel_cast_icon',
      centerPx,
      duration: 1500
    });
    setTimeout(() => {
      this._emit({
        type: 'dragon_dispel_wave',
        centerPx,
        targetPx,
        duration: 1200
      });
    }, 1500);
  }

  _fireBreath(sourceCoords, targetCoords, duration = 1500) {
    const centerPx = this._getHugeCenterPx(sourceCoords);
    const targetPx = this._px(targetCoords);
    const isTargetLeft = targetPx.x < centerPx.x;
    const originPx = {
      x: isTargetLeft ? centerPx.x - this.TILE_SIZE * 1.1 : centerPx.x + this.TILE_SIZE * 1.1,
      y: centerPx.y
    };
    const dx = targetPx.x - originPx.x;
    const dy = targetPx.y - originPx.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    this._emit({
      type: 'dragon_fire_breath',
      originPx,
      targetPx,
      length,
      angle,
      duration
    });
  }

  _rakeStrike(src, tgt, sourceUnitId = null) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const midPx = { x: srcPx.x + dx * 0.6, y: srcPx.y + dy * 0.6 };
    const angle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 180;

    this._emit({
      type: 'claw_swipe',
      srcPx,
      tgtPx,
      midPx,
      angle,
      icon: rake,
      duration: 750,
      sourceUnitId,
    });

    setTimeout(() => {
      this._emit({
        type: 'claw_hit',
        tgtPx,
        icon: claw_hit,
        duration: 400,
        sourceUnitId,
      });
    }, 500);
  }

  _goreHorns(src, tgt, sourceUnitId) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'shield_slam_connect',
      srcPx,
      tgtPx,
      srcCoords: src,
      tgtCoords: tgt,
      sourceUnitId,
      icon: gore_horns,
      duration: 600,
    });
  }

  _silenceProjectile(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._getImpactTargetPx(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this._emit({
      type: 'silence_projectile',
      srcPx,
      tgtPx,
      angle,
      duration: 1000,
    });
    setTimeout(() => {
      this._emit({
        type: 'silence_hit',
        tgtPx,
        duration: 500,
      });
    }, 950);
  }

  _demonMarkOverlay(src) {
    this._emit({
      type: 'demon_mark_overlay',
      srcPx: this._px(src),
      icon: demon_mark,
      duration: 1500,
    });
  }

  _demonMarkHit(src, tgt) {
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'demon_mark_hit',
      tgtPx,
      icon: demon_mark,
      duration: 1200
    });
  }

  _newMoonOverlay(src) {
    this._emit({
      type: 'new_moon_overlay',
      srcPx: this._px(src),
      icon: new_moon,
      duration: 1800
    });
  }

  _malevolentPresenceFear(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'fear_pulse',
      srcPx,
      tgtPx,
      icon: fear,
      duration: 1000
    });
  }

  // ─── Beholder skill animations ───────────────────────────────────────────────

  _chainbolt(src, tgt, sourceUnitId, customDuration) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const duration = customDuration || 500;

    // White energy beam
    this._emit({
      type: 'chainbolt_beam',
      srcPx,
      tgtPx,
      angle,
      length,
      sourceUnitId,
      duration: duration,
    });
    setTimeout(() => {
      this._emit({
        type: 'chainbolt_hit',
        tgtPx,
        duration: Math.min(500, duration),
      });
    }, duration * 0.9);
  }

  _mindSwapBeam(src, tgt, variant = 'mind_swap', customDuration) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const duration = customDuration || 3000;
    // Purple psychic beam
    this._emit({
      type: 'mind_swap_beam',
      srcPx,
      tgtPx,
      angle,
      length,
      variant,
      duration: duration,
    });
    setTimeout(() => {
      this._emit({
        type: 'mind_swap_hit',
        tgtPx,
        variant,
        duration: Math.min(1000, duration * 0.33),
      });
    }, duration * 0.9);
  }

  _displacementRay(src, tgt, customDuration) {
    const srcPx = this._px(src);
    const tgtPx = this._getImpactTargetPx(tgt);
    const dx = tgtPx.x - srcPx.x;
    const dy = tgtPx.y - srcPx.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const duration = customDuration || 600;
    // Orange destabilisation ray
    this._emit({
      type: 'displacement_ray_beam',
      srcPx,
      tgtPx,
      angle,
      length,
      duration: duration,
    });
    setTimeout(() => {
      this._emit({
        type: 'displacement_ray_hit',
        tgtPx,
        duration: Math.min(500, duration * 0.8),
      });
    }, duration * 0.9);
  }

  _beholderInvisibility(src, sourceUnitId) {
    const srcPx = this._px(src);
    // Shimmering fade-out on the beholder tile
    this._emit({
      type: 'beholder_invisibility_shimmer',
      srcPx,
      sourceUnitId,
      duration: 1200,
    });
  }

  _voidbite(src, tgt, sourceUnitId) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    // We want the divide between target and most adjacent tile towards Beholder.
    const pxDx = srcPx.x - tgtPx.x;
    const pxDy = srcPx.y - tgtPx.y;
    const dist = Math.sqrt(pxDx * pxDx + pxDy * pxDy);
    
    // Move half a TILE_SIZE (50px) towards Beholder from target
    const offsetDist = 50; 
    const midPx = dist > 0 ? {
      x: tgtPx.x + (pxDx / dist) * offsetDist,
      y: tgtPx.y + (pxDy / dist) * offsetDist,
    } : tgtPx;
    this._emit({
      type: 'voidbite_chomp',
      srcPx,
      tgtPx,
      midPx,
      sourceUnitId,
      duration: 700,
    });
    setTimeout(() => {
      this._emit({
        type: 'voidbite_hit',
        tgtPx: midPx,
        duration: 400,
      });
    }, 500);
  }

  _eldritchWind(src) {
    const srcPx = this._px(src);
    this._emit({
      type: 'eldritch_wind_overlay',
      srcPx,
      duration: 1500
    });
  }

  _paradoxEngineSuccess(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'paradox_warp_source',
      srcPx,
      duration: 1000
    });
    this._emit({
      type: 'paradox_warp_target',
      tgtPx,
      duration: 1000
    });
  }

  _paradoxEngineFail(src, tgt) {
    const srcPx = this._px(src);
    const tgtPx = this._px(tgt);
    this._emit({
      type: 'paradox_fail_burst',
      tgtPx,
      duration: 1000
    });
  }
}
