'use strict';

(function() {

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
.pos.appear .ring {
  transform: scale(0.55);
  opacity: 1;
  transition: transform 0.33s, opacity 0.5s;
}
.pointer::after {
  content: '';
  position: absolute;
  width: 1em;
  height: 1em;
  border-radius: 1em;
  background: currentColor;
  transform: scale(0);
  will-change: transform;
  transition: transform 0.33s;
}
.pos.appear .pointer::after {
  transform: scale(1);
}

@keyframes pulse {
  0%   { transform: scale(1.0); }
  100% { transform: scale(0.9); }
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
.pos.winner .effect {
  transition: transform 0.5s, opacity 0.1s;
  transform: scale(0.5);
  opacity: 1;
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
  }

  pointerDown_(ev) {
    if (this.winnerMode_) {
      return false;  // do nothing
    }

    const pos = document.createElement('div');
    pos.className = 'pos';
    window.requestAnimationFrame(function() {
      pos.classList.add('appear');
    });
    pos.innerHTML = `<div class="pointer"><div class="ring"></div></div><div class="effect"></div>`;

    const color = Math.random() * 360;
    pos.style.color = `hsl(${color}, 100%, 54%)`;

    this.position_(ev, pos);
    this.p_.set(ev.pointerId, pos);
    this.outer_.setPointerCapture(ev.pointerId);  // future callbacks are rel to outer

    window.clearTimeout(this.chooseWinnerTimeout_);
    this.chooseWinnerTimeout_ = null;

    // TOOD: should be >2
    if (this.p_.size >= 1) {
      this.chooseWinnerTimeout_ = window.setTimeout(this.chooseWinner_.bind(this), 2500);
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
      window.clearTimeout(this.chooseWinnerTimeout_);
      this.chooseWinnerTimeout_ = null;
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

  connectedCallback() {
    
  }
}

customElements.define('choose-board', ChooseBoardElement);

}());