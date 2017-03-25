'use strict';

(function() {

class ChoosePlayerElement extends HTMLElement {
  constructor() {
    super();

    const root = this.attachShadow({mode: 'open'});
    root.innerHTML = `
<style>
.pointer {
  display: block;
  position: absolute;
  will-change: transform;
  transform-origin: 0.5em 0.5em;
  animation: pulse 0.33s infinite alternate;
}
.ring {
  width: 3em;
  height: 3em;
  position: absolute;
  left: -1em;
  top: -1em;
  border-radius: 100%;
  box-sizing: border-box;
  border: 0.3em solid currentColor;
  opacity: 0;
  transition: transform 0.33s, opacity 0.25s;
}
:host(.appear) .ring {
  transform: scale(0.55);
  opacity: 1;
  transition: transform 0.33s, opacity 0.5s;
}

@keyframes pulse {
  0%   { transform: scale(1.0); }
  100% { transform: scale(0.9); }
}

#orient {
  will-change: transform;
}

.effect {
  pointer-events: none;
  position: absolute;
  margin-left: -2.5em;
  margin-top: -2.5em;
  width: 6em;
  height: 6em;
  border-radius: 100%;
  box-shadow: 0 0 0 300vmax currentColor;
  transform: scale(4);
  transition: transform 0.5s, opacity 2s;
  opacity: 0;
}
:host(.winner) .effect {
  transition: transform 0.5s, opacity 0.1s;
  transform: scale(0.5);
  opacity: 1;
}

/** CSS inspired by http://dabblet.com/gist/4589858 */

.triangle, .triangle:before, .triangle:after { width: 1em; height: 1em; }
.triangle {
  position: relative;
  border-radius: 20%;
  overflow: hidden;
  will-change: transform;
  transform: translateY(30%) rotate(30deg) skewY(30deg) scale(0);
  transition: transform 0.2s;
} 
:host(.appear) .triangle {
  transform: translateY(30%) rotate(30deg) skewY(30deg) scaleX(.866);
}
.triangle:before, .triangle:after {
  content: '';
  position: absolute;
  background: currentColor;
}
.triangle:before {
  border-radius: 20%;
  border-bottom-left-radius: 53%;
  transform: scaleX(1.155) skewY(-30deg) rotate(-30deg) translateY(-42.3%) skewX(30deg) scaleY(.866) translateX(-24%);
}
.triangle:after {
  border-radius: 20%;
  border-bottom-right-radius: 53%;
  transform: scaleX(1.155) skewY(-30deg) rotate(-30deg) translateY(-42.3%) skewX(-30deg) scaleY(.866) translateX(24%);
}
</style>
<div class="pointer">
  <div class="ring"></div>
  <div id="orient">
    <div class="triangle"></div>
  </div>
</div>
<div class="effect"></div>
`;

    this.orient_ = root.getElementById('orient');
    this.angle_ = 0;
  }

  set angle(v) {
    this.angle_ = v || 0;
    this.orient_.style.transform = `rotate(${this.angle_}deg)`;
  }

  get angle() {
    return this.angle_;
  }
}

class ChooseBoardElement extends HTMLElement {
  constructor() {
    super();

    const root = this.attachShadow({mode: 'open'});
    root.innerHTML = `
<style>
:host {
  position: relative;
}
#outer {
  width: 100%;
  height: 100%;
  position: absolute;
  background: black;
  font-size: 20vmin;
  touch-action: none;
  cursor: pointer;
  /* TODO: overflow hidden? */
}
.pos {
  position: absolute;
  width: 1em;
  height: 1em;
  margin-top: -0.5em;
  margin-left: -0.5em;
  will-change: transform;
  pointer-events: none;
  transition: transform 0.05s;
}
</style>
<div id="outer">
  <div id="effect"></div>
</div>
    `;
    this.outer_ = root.getElementById('outer');
    this.effect_ = root.getElementById('effect');
    this.p_ = new Map();
    this.chooseWinnerTimeout_ = null;
    this.winnerMode_ = false;

    this.outer_.addEventListener('pointerdown', this.pointerDown_.bind(this));
    this.outer_.addEventListener('pointermove', this.pointerMove_.bind(this));

    ['up', 'cancel', 'out', 'leave'].forEach(name => {
      this.outer_.addEventListener('pointer' + name, this.pointerDone_.bind(this));
    });

    this.outer_.addEventListener('contextmenu', ev => ev.preventDefault());
  }

  position_(ev, el) {
    el.style.transform = `translate(${ev.offsetX}px, ${ev.offsetY}px)`;
    if (el.parentNode !== this.outer_) {
      this.outer_.appendChild(el);
    }

    const angle = Math.atan2(this.offsetHeight / 2 - ev.offsetY, this.offsetWidth / 2 - ev.offsetX) * 180 / Math.PI;
    el.angle = angle + 90;
  }

  pointerDown_(ev) {
    if (this.winnerMode_) {
      return false;  // do nothing
    }

    const pos = document.createElement('choose-player');
    pos.className = 'pos';
    window.requestAnimationFrame(function() {
      pos.classList.add('appear');
    });

    const color = Math.random() * 360;
    pos.style.color = `hsl(${color}, 100%, 54%)`;

    this.position_(ev, pos);
    this.p_.set(ev.pointerId, pos);
    this.outer_.setPointerCapture(ev.pointerId);  // future callbacks are rel to outer

    this.maybeRestartWinnerTimeout_();
  }

  maybeRestartWinnerTimeout_() {
    const wasActive = !!this.chooseWinnerTimeout_;
    window.clearTimeout(this.chooseWinnerTimeout_);
    this.chooseWinnerTimeout_ = null;

    // TOOD: should be >2
    const isMobile = window.orientation !== undefined;
    const threshold = (isMobile ? 2 : 1);  // allow single on desktop
    if (this.p_.size >= threshold) {
      this.chooseWinnerTimeout_ = window.setTimeout(this.chooseWinner_.bind(this), 2500);
      const event = new CustomEvent('feedback', {bubbles: true, detail: 2500});
      this.dispatchEvent(event);
    } else if (wasActive) {
      const event = new CustomEvent('feedback', {bubbles: true, detail: 0});
      this.dispatchEvent(event);
    }
  }

  chooseWinner_() {
    const choices = [...this.p_.keys()];
    const choice = Math.floor(Math.random() * choices.length);
    const winner = choices[choice];

    choices.forEach(other => {
      if (other !== winner) {
        this.clearPointer_(other);
      }
    });

    this.winnerMode_ = true;

    const pos = this.p_.get(winner);
    pos.appendChild(this.effect_);
    pos.classList.add('winner');

    window.requestAnimationFrame(() => {
      this.effect_.classList.add('winner');
    });

    const event = new CustomEvent('winner', {bubbles: true, detail: pos.style.color});
    this.dispatchEvent(event);
  }

  pointerMove_(ev) {
    const pos = this.p_.get(ev.pointerId);
    if (!pos) { return; }
    this.position_(ev, pos);
  }

  pointerDone_(ev) {
    if (this.clearPointer_(ev.pointerId)) {
      this.maybeRestartWinnerTimeout_();  // still active if many pointers active
    }
  }

  /**
   * @param {number} id pointerId to clear
   * @param {boolean=} opt_force whether to force
   * @return {boolean} whether the id was cleared
   */
  clearPointer_(id, opt_force) {
    const pos = this.p_.get(id);
    if (!pos) { return false; }

    if (!opt_force && this.winnerMode_) {
      // delays removal by 1s
      window.setTimeout(this.clearPointer_.bind(this, id, true), 1000);
      return undefined;
    }

    this.p_.delete(id);
    if (!this.p_.size) {
      const event = new CustomEvent('winner', {bubbles: true, detail: null});
      this.dispatchEvent(event);
      this.winnerMode_ = false;
      this.effect_.classList.remove('winner');
    }

    pos.classList.remove('winner');

    if (!pos.classList.contains('appear')) {
      pos.remove();
    } else {
      pos.classList.remove('appear');
      pos.addEventListener('transitionend', _ => {
        pos.remove();
      });
    }
    return true;
  }
}

customElements.define('choose-board', ChooseBoardElement);
customElements.define('choose-player', ChoosePlayerElement);

}());