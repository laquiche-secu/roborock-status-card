class RoborockStatusCard extends HTMLElement {

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Merci de renseigner 'entity' (l'entité vacuum du robot).");
    }
    this._config = config;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {
      entity: "vacuum.nestor_ii",
      duration_entity: "",
      room_entity: "",
      last_clean_entity: "",
      water_entity: "",
      water_ok_state: "OK",
      error_entity: "",
      error_ok_state: "Aucun",
      scenes: []
    };
  }

  _state(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _callService(domain, service, entityId) {
    if (!entityId) return;
    this._hass.callService(domain, service, { entity_id: entityId });
  }

  _renderPill(label, entityId) {
    const st = this._state(entityId);
    const value = st ? st.state : "—";
    return `
      <div class="pill">
        <div class="pill-label">${label}</div>
        <div class="pill-value">${value}</div>
      </div>
    `;
  }

  _renderWarning(entityId, okState) {
    const st = this._state(entityId);
    if (!st || !okState) return "";
    if (st.state === okState) return "";
    const name = st.attributes.friendly_name || entityId;
    return `
      <div class="warning">
        <ha-icon icon="mdi:alert"></ha-icon>
        <span>${name} : ${st.state}</span>
      </div>
    `;
  }

  _renderScenes() {
    const scenes = this._config.scenes || [];
    if (!scenes.length) return "";
    const buttons = scenes.map((s, i) => `
      <button class="scene-btn" data-index="${i}">
        <ha-icon icon="${s.icon || "mdi:play"}"></ha-icon>
        <span>${s.name || s.entity}</span>
      </button>
    `).join("");
    return `<div class="scenes">${buttons}</div>`;
  }

  _render() {
    if (!this._config || !this._hass) return;

    const vacuum = this._state(this._config.entity);
    const name = this._config.name || (vacuum ? vacuum.attributes.friendly_name : this._config.entity);
    const stateText = vacuum ? vacuum.state : "indisponible";
    const battery = vacuum && vacuum.attributes.battery_level != null ? `${vacuum.attributes.battery_level}%` : "—";
    const isCleaning = vacuum && vacuum.state === "cleaning";

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .name-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .name-row ha-icon {
          --mdc-icon-size: 24px;
          color: var(--primary-color);
        }
        .titles .name {
          font-size: 15px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .titles .state {
          font-size: 12px;
          color: var(--secondary-text-color);
          text-transform: capitalize;
        }
        .battery {
          font-size: 13px;
          color: var(--secondary-text-color);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .pill {
          background: var(--secondary-background-color);
          border-radius: 8px;
          padding: 8px 6px;
          text-align: center;
        }
        .pill-label {
          font-size: 11px;
          color: var(--secondary-text-color);
          margin-bottom: 2px;
        }
        .pill-value {
          font-size: 13px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .warning {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(var(--rgb-warning-color, 255,152,0), 0.15);
          color: var(--warning-color);
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-size: 12px;
        }
        .warning ha-icon {
          --mdc-icon-size: 16px;
        }
        .scenes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .scene-btn, .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          cursor: pointer;
        }
        .scene-btn:active, .action-btn:active {
          opacity: 0.7;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .action-btn.primary {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border: none;
        }
        .action-btn ha-icon, .scene-btn ha-icon {
          --mdc-icon-size: 16px;
        }
      </style>
      <ha-card>
        <div class="header">
          <div class="name-row">
            <ha-icon icon="mdi:robot-vacuum"></ha-icon>
            <div class="titles">
              <div class="name">${name}</div>
              <div class="state">${stateText}</div>
            </div>
          </div>
          <div class="battery">
            <ha-icon icon="mdi:battery"></ha-icon>${battery}
          </div>
        </div>

        <div class="grid">
          ${this._renderPill("Durée", this._config.duration_entity)}
          ${this._renderPill("Pièce", this._config.room_entity)}
          ${this._renderPill("Dernier passage", this._config.last_clean_entity)}
        </div>

        ${this._renderWarning(this._config.water_entity, this._config.water_ok_state)}
        ${this._renderWarning(this._config.error_entity, this._config.error_ok_state)}

        ${this._renderScenes()}

        <div class="actions">
          <button class="action-btn primary" id="start-pause">
            <ha-icon icon="${isCleaning ? "mdi:pause" : "mdi:play"}"></ha-icon>
            <span>${isCleaning ? "Pause" : "Démarrer"}</span>
          </button>
          <button class="action-btn" id="dock">
            <ha-icon icon="mdi:home"></ha-icon>
            <span>Retour base</span>
          </button>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".scene-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const scene = this._config.scenes[btn.dataset.index];
        this._callService("button", "press", scene.entity);
      });
    });

    this.shadowRoot.getElementById("start-pause").addEventListener("click", () => {
      this._callService("vacuum", isCleaning ? "pause" : "start", this._config.entity);
    });

    this.shadowRoot.getElementById("dock").addEventListener("click", () => {
      this._callService("vacuum", "return_to_base", this._config.entity);
    });
  }
}

customElements.define("roborock-status-card", RoborockStatusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "roborock-status-card",
  name: "Roborock status card",
  description: "Carte compacte pour piloter et surveiller un robot Roborock.",
  preview: false
});
