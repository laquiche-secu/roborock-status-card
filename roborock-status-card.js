const EDITOR_SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "vacuum" } } },
  { name: "name", selector: { text: {} } },
  { name: "status_entity", selector: { entity: { domain: "sensor" } } },
  { name: "duration_entity", selector: { entity: { domain: "sensor" } } },
  { name: "room_entity", selector: { entity: { domain: "sensor" } } },
  { name: "last_clean_entity", selector: { entity: { domain: "sensor" } } },
  { name: "mode_entity", selector: { entity: { domain: "select" } } },
  { name: "mop_intensity_entity", selector: { entity: { domain: "select" } } },
  { name: "areas", selector: { area: { multiple: true } } }
];

const EDITOR_LABELS = {
  entity: "Entité vacuum (obligatoire)",
  name: "Nom affiché",
  status_entity: "Capteur : état détaillé (optionnel — remplace l'état générique, capte les phases comme le lavage de serpillière)",
  duration_entity: "Capteur : durée du dernier nettoyage",
  room_entity: "Capteur : pièce actuelle",
  last_clean_entity: "Capteur : fin du dernier nettoyage",
  mode_entity: "Sélecteur : mode de nettoyage",
  mop_intensity_entity: "Sélecteur : intensité de frottement",
  areas: "Pièces proposées au nettoyage personnalisé (nécessite d'avoir mappé les segments du robot vers ces pièces dans les paramètres de l'entité)"
};

class RoborockStatusCardEditor extends HTMLElement {

  setConfig(config) {
    this._config = { scenes: [], error_checks: [], areas: [], ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._syncHass();
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  _emitChange(newConfig) {
    this._config = newConfig;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }

  _syncHass() {
    if (!this.shadowRoot) return;
    const form = this.shadowRoot.querySelector("ha-form");
    if (form) form.hass = this._hass;
    this.shadowRoot.querySelectorAll("ha-entity-picker, ha-icon-picker").forEach((el) => {
      el.hass = this._hass;
    });
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
          margin-bottom: 8px;
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
        .scene-row {
          display: grid;
          grid-template-columns: 2fr 1.3fr 1fr auto;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }
        .check-row {
          display: grid;
          grid-template-columns: 1.6fr 1.1fr 1fr auto auto;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }

        .remove-btn, .add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          cursor: pointer;
          padding: 8px;
          font-size: 13px;
        }
        .remove-btn {
          padding: 8px 10px;
          color: var(--error-color, #db4437);
        }
        .use-current-btn {
          padding: 8px 10px;
          color: var(--primary-color);
        }
        .add-btn {
          width: 100%;
          margin-top: 4px;
        }
        .ok-select {
          height: 36px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 13px;
          padding: 0 8px;
          width: 100%;
        }
      </style>
      <div class="section">
        <ha-form></ha-form>
      </div>
      <div class="section">
        <div class="section-title">Boutons de scènes</div>
        <div id="scenes"></div>
        <button class="add-btn" id="add-scene">
          <ha-icon icon="mdi:plus"></ha-icon><span>Ajouter un bouton</span>
        </button>
      </div>
      <div class="section">
        <div class="section-title">Vérifications d'erreur</div>
        <div class="hint">Un message n'apparaît sur la carte que si l'état du capteur diffère de l'état "normal" indiqué.</div>
        <div id="checks"></div>
        <button class="add-btn" id="add-check">
          <ha-icon icon="mdi:plus"></ha-icon><span>Ajouter une vérification</span>
        </button>
      </div>
    `;

    const form = this.shadowRoot.querySelector("ha-form");
    form.hass = this._hass;
    form.schema = EDITOR_SCHEMA;
    form.data = this._config;
    form.computeLabel = (schema) => EDITOR_LABELS[schema.name] || schema.name;
    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._emitChange({ ...this._config, ...ev.detail.value });
    });

    this._renderScenes();
    this._renderChecks();

    this.shadowRoot.getElementById("add-scene").addEventListener("click", () => {
      const scenes = [...(this._config.scenes || []), { entity: "", name: "", icon: "mdi:play" }];
      this._emitChange({ ...this._config, scenes });
      this._renderScenes();
    });

    this.shadowRoot.getElementById("add-check").addEventListener("click", () => {
      const error_checks = [...(this._config.error_checks || []), { entity: "", ok_state: "OK", name: "" }];
      this._emitChange({ ...this._config, error_checks });
      this._renderChecks();
    });
  }

  _renderScenes() {
    const container = this.shadowRoot.getElementById("scenes");
    container.innerHTML = "";

    (this._config.scenes || []).forEach((scene, index) => {
      const row = document.createElement("div");
      row.className = "scene-row";

      const picker = document.createElement("ha-entity-picker");
      picker.hass = this._hass;
      picker.label = "Entité";
      picker.includeDomains = ["button", "script"];
      picker.value = scene.entity || "";
      picker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._patchScene(index, { entity: ev.detail.value || "" });
      });

      const nameField = document.createElement("ha-textfield");
      nameField.label = "Nom";
      nameField.value = scene.name || "";
      nameField.addEventListener("change", (ev) => {
        this._patchScene(index, { name: ev.target.value });
      });

      const iconPicker = document.createElement("ha-icon-picker");
      iconPicker.hass = this._hass;
      iconPicker.label = "Icône";
      iconPicker.value = scene.icon || "";
      iconPicker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._patchScene(index, { icon: ev.detail.value || "" });
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = '<ha-icon icon="mdi:delete-outline"></ha-icon>';
      removeBtn.addEventListener("click", () => {
        const scenes = [...this._config.scenes];
        scenes.splice(index, 1);
        this._emitChange({ ...this._config, scenes });
        this._renderScenes();
      });

      row.appendChild(picker);
      row.appendChild(nameField);
      row.appendChild(iconPicker);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });
  }

  _patchScene(index, patch) {
    const scenes = [...this._config.scenes];
    scenes[index] = { ...scenes[index], ...patch };
    this._emitChange({ ...this._config, scenes });
  }

  _renderChecks() {
    const container = this.shadowRoot.getElementById("checks");
    container.innerHTML = "";

    (this._config.error_checks || []).forEach((check, index) => {
      const row = document.createElement("div");
      row.className = "check-row";

      const picker = document.createElement("ha-entity-picker");
      picker.hass = this._hass;
      picker.label = "Capteur";
      picker.value = check.entity || "";
      picker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._patchCheck(index, { entity: ev.detail.value || "" });
        this._renderChecks();
      });

      const nameField = document.createElement("ha-textfield");
      nameField.label = "Libellé";
      nameField.value = check.name || "";
      nameField.addEventListener("change", (ev) => {
        this._patchCheck(index, { name: ev.target.value });
      });

      const okField = document.createElement("ha-textfield");
      okField.label = "État normal";
      okField.value = check.ok_state || "";
      okField.addEventListener("change", (ev) => {
        this._patchCheck(index, { ok_state: ev.target.value });
      });

      const useCurrentBtn = document.createElement("button");
      useCurrentBtn.className = "use-current-btn";
      useCurrentBtn.title = "Utiliser l'état actuel comme état normal";
      useCurrentBtn.innerHTML = '<ha-icon icon="mdi:target"></ha-icon>';
      useCurrentBtn.addEventListener("click", () => {
        const currentState = check.entity && this._hass ? this._hass.states[check.entity] : null;
        if (!currentState) return;
        okField.value = currentState.state;
        this._patchCheck(index, { ok_state: currentState.state });
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = '<ha-icon icon="mdi:delete-outline"></ha-icon>';
      removeBtn.addEventListener("click", () => {
        const error_checks = [...this._config.error_checks];
        error_checks.splice(index, 1);
        this._emitChange({ ...this._config, error_checks });
        this._renderChecks();
      });

      row.appendChild(picker);
      row.appendChild(nameField);
      row.appendChild(okField);
      row.appendChild(useCurrentBtn);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });
  }

  _patchCheck(index, patch) {
    const error_checks = [...this._config.error_checks];
    error_checks[index] = { ...error_checks[index], ...patch };
    this._emitChange({ ...this._config, error_checks });
  }
}

customElements.define("roborock-status-card-editor", RoborockStatusCardEditor);

class RoborockStatusCard extends HTMLElement {

  constructor() {
    super();
    this._selectedAreas = new Set();
    this._panelOpen = false;
    this._lastScene = null;
  }

  static getConfigElement() {
    return document.createElement("roborock-status-card-editor");
  }

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

  static getStubConfig(hass) {
    const vacuumEntity = Object.keys(hass.states).find((id) => id.startsWith("vacuum."));
    return {
      entity: vacuumEntity || "vacuum.nestor_ii",
      duration_entity: "",
      room_entity: "",
      last_clean_entity: "",
      scenes: [],
      areas: [],
      error_checks: [
        { entity: "", ok_state: "OK", name: "Erreur du dock" },
        { entity: "", ok_state: "OK", name: "Réservoir d'eau sale" },
        { entity: "", ok_state: "OK", name: "Réservoir d'eau propre" },
        { entity: "", ok_state: "Aucun", name: "Erreur de l'aspirateur" },
        { entity: "", ok_state: "OK", name: "Pénurie d'eau" },
        { entity: "", ok_state: "Attaché", name: "Réservoir d'eau fixé" },
        { entity: "", ok_state: "Attachée", name: "Serpillière fixée" }
      ]
    };
  }

  _state(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _callService(domain, service, entityId, extraData) {
    if (!entityId) return;
    this._hass.callService(domain, service, { entity_id: entityId, ...(extraData || {}) });
  }

  _renderPill(label, entityId, formatter) {
    const st = this._state(entityId);
    const value = st ? (formatter ? formatter(st) : st.state) : "—";
    return `
      <div class="pill">
        <div class="pill-label">${label}</div>
        <div class="pill-value">${value}</div>
      </div>
    `;
  }

  _formatDuration(st) {
    const num = parseFloat(st.state);
    if (isNaN(num)) return st.state;
    const unit = st.attributes.unit_of_measurement || "min";
    return `${Math.round(num)} ${unit}`;
  }

  _formatVacuumState(st) {
    const labels = {
      cleaning: "Nettoyage en cours",
      docked: "À la station",
      idle: "En attente",
      paused: "En pause",
      returning: "Retour à la base",
      error: "Erreur",
      mopping: "Lavage en cours"
    };
    return labels[st.state] || (st.state.charAt(0).toUpperCase() + st.state.slice(1));
  }

  _currentStatusText(vacuum) {
    const statusEntity = this._config.status_entity;
    if (statusEntity) {
      const st = this._state(statusEntity);
      if (st) return st.state;
    }
    return vacuum ? this._formatVacuumState(vacuum) : "indisponible";
  }

  _formatTimestamp(st) {
    const date = new Date(st.state);
    if (isNaN(date.getTime())) return st.state;
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.round(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  _renderErrorChecks() {
    const checks = this._config.error_checks || [];
    const normalize = (s) => String(s).trim().toLowerCase();
    const alerts = checks
      .map((check) => {
        const st = this._state(check.entity);
        if (!st || !check.ok_state) return null;
        if (normalize(st.state) === normalize(check.ok_state)) return null;
        const label = check.error_message || check.name || st.attributes.friendly_name || check.entity;
        return `
          <div class="warning">
            <ha-icon icon="mdi:alert"></ha-icon>
            <span>${label}</span>
          </div>
        `;
      })
      .filter(Boolean);
    return alerts.join("");
  }

  _renderScenes() {
    const scenes = this._config.scenes || [];
    if (!scenes.length) return "";
    const buttons = scenes.map((s, i) => `
      <button class="scene-btn ${this._lastScene === i ? "selected" : ""}" data-index="${i}">
        <ha-icon icon="${s.icon || "mdi:play"}"></ha-icon>
        <span>${s.name || s.entity}</span>
      </button>
    `).join("");
    return `<div class="scenes">${buttons}</div>`;
  }

  _renderOptionSelect(label, entityId, cssMarker) {
    const st = this._state(entityId);
    if (!st || !st.attributes.options) return "";
    const options = st.attributes.options;
    return `
      <div class="select-row">
        <div class="select-label">${label}</div>
        <select class="native-select" data-select-entity="${entityId}" data-select-kind="${cssMarker}">
          ${options.map((o) => `<option value="${o}" ${o === st.state ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </div>
    `;
  }

  _renderFanSpeedSelect(vacuum) {
    if (!vacuum || !vacuum.attributes.fan_speed_list) return "";
    const options = vacuum.attributes.fan_speed_list;
    const current = vacuum.attributes.fan_speed;
    return `
      <div class="select-row">
        <div class="select-label">Puissance d'aspiration</div>
        <select class="native-select" data-fan-select="1">
          ${options.map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </div>
    `;
  }

  _renderCustomPanel(vacuum) {
    const areaIds = this._config.areas || [];
    const modeSelect = this._renderOptionSelect("Mode de nettoyage", this._config.mode_entity, "mode");
    const mopSelect = this._renderOptionSelect("Intensité de frottement", this._config.mop_intensity_entity, "mop");
    const fanSelect = this._renderFanSpeedSelect(vacuum);

    const chips = areaIds.map((areaId) => {
      const area = this._hass.areas ? this._hass.areas[areaId] : null;
      const label = area ? area.name : areaId;
      const icon = (area && area.icon) || "mdi:floor-plan";
      return `
        <button class="room-chip ${this._selectedAreas.has(areaId) ? "selected" : ""}" data-area-id="${areaId}">
          <ha-icon icon="${icon}"></ha-icon>
          <span>${label}</span>
        </button>
      `;
    }).join("");

    return `
      <div class="custom-panel">
        ${areaIds.length ? `<div class="rooms-chips">${chips}</div>` : `<div class="hint">Aucune pièce configurée. Ajoute des Areas dans l'éditeur de la carte (nécessite d'avoir mappé les segments du robot vers ces pièces au préalable, via l'entité vacuum > ⚙️ > "Mapper les segments vers des pièces").</div>`}
        ${modeSelect}
        ${mopSelect}
        ${fanSelect}
        <button class="action-btn primary" id="clean-rooms" ${this._selectedAreas.size === 0 ? "disabled" : ""}>
          <ha-icon icon="mdi:play"></ha-icon>
          <span>Nettoyer la sélection</span>
        </button>
      </div>
    `;
  }

  _render() {
    if (!this._config || !this._hass) return;

    const vacuum = this._state(this._config.entity);
    const name = this._config.name || (vacuum ? vacuum.attributes.friendly_name : this._config.entity);
    const stateText = this._currentStatusText(vacuum);
    const battery = vacuum && vacuum.attributes.battery_level != null ? `${vacuum.attributes.battery_level}%` : "—";
    const inactiveStates = ["docked", "idle", "paused", "error"];
    const isActiveCycle = vacuum && !inactiveStates.includes(vacuum.state);

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
        .scene-btn.selected {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border-color: var(--primary-color);
        }
        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .action-btn:not(.icon-only) {
          flex: 1 1 auto;
          min-width: 90px;
        }
        .action-btn.primary {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border: none;
        }
        .action-btn ha-icon, .scene-btn ha-icon {
          --mdc-icon-size: 16px;
        }
        .action-btn.icon-only {
          flex: 0 0 auto;
          width: 40px;
        }
        .action-btn[disabled] {
          opacity: 0.5;
          cursor: default;
        }
        .custom-panel {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 0.5px solid var(--divider-color);
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
        .rooms-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .room-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          cursor: pointer;
        }
        .room-chip.selected {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border-color: var(--primary-color);
        }
        .room-chip ha-icon {
          --mdc-icon-size: 15px;
        }
        .select-row {
          margin-bottom: 10px;
        }
        .select-label {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }
        .native-select {
          width: 100%;
          height: 36px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 13px;
          padding: 0 8px;
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
          ${this._renderPill("Durée", this._config.duration_entity, (st) => this._formatDuration(st))}
          ${this._renderPill("Pièce", this._config.room_entity)}
          <div class="pill">
            <div class="pill-label">État</div>
            <div class="pill-value">${stateText}</div>
          </div>
        </div>

        ${this._renderErrorChecks()}

        ${this._renderScenes()}

        <div class="actions">
          <button class="action-btn primary" id="start-pause">
            <ha-icon icon="${isActiveCycle ? "mdi:pause" : "mdi:play"}"></ha-icon>
            <span>${isActiveCycle ? "Pause" : "Démarrer"}</span>
          </button>
          ${isActiveCycle ? `
            <button class="action-btn icon-only" id="stop-clean" title="Arrêter">
              <ha-icon icon="mdi:stop"></ha-icon>
            </button>
          ` : ""}
          <button class="action-btn" id="dock">
            <ha-icon icon="mdi:home"></ha-icon>
            <span>Retour base</span>
          </button>
          <button class="action-btn icon-only" id="toggle-panel" title="Nettoyage personnalisé">
            <ha-icon icon="mdi:tune"></ha-icon>
          </button>
        </div>

        ${this._panelOpen ? this._renderCustomPanel(vacuum) : ""}
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".scene-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        const scene = this._config.scenes[index];
        this._callService("button", "press", scene.entity);
        this._lastScene = index;
        this.shadowRoot.querySelectorAll(".scene-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });

    this.shadowRoot.getElementById("start-pause").addEventListener("click", () => {
      this._callService("vacuum", isActiveCycle ? "pause" : "start", this._config.entity);
    });

    const stopBtn = this.shadowRoot.getElementById("stop-clean");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        this._callService("vacuum", "stop", this._config.entity);
      });
    }

    this.shadowRoot.getElementById("dock").addEventListener("click", () => {
      this._callService("vacuum", "return_to_base", this._config.entity);
    });

    this.shadowRoot.getElementById("toggle-panel").addEventListener("click", () => {
      this._panelOpen = !this._panelOpen;
      this._render();
    });

    if (this._panelOpen) {
      this.shadowRoot.querySelectorAll(".room-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const areaId = chip.dataset.areaId;
          if (this._selectedAreas.has(areaId)) {
            this._selectedAreas.delete(areaId);
          } else {
            this._selectedAreas.add(areaId);
          }
          this._render();
        });
      });

      this.shadowRoot.querySelectorAll("select[data-select-entity]").forEach((sel) => {
        sel.addEventListener("change", (ev) => {
          this._callService("select", "select_option", sel.dataset.selectEntity, { option: ev.target.value });
        });
      });

      const fanSelect = this.shadowRoot.querySelector("select[data-fan-select]");
      if (fanSelect) {
        fanSelect.addEventListener("change", (ev) => {
          this._callService("vacuum", "set_fan_speed", this._config.entity, { fan_speed: ev.target.value });
        });
      }

      const cleanRoomsBtn = this.shadowRoot.getElementById("clean-rooms");
      if (cleanRoomsBtn) {
        cleanRoomsBtn.addEventListener("click", () => {
          if (this._selectedAreas.size === 0) return;
          this._callService("vacuum", "clean_area", this._config.entity, {
            cleaning_area_id: [...this._selectedAreas]
          });
        });
      }
    }
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
