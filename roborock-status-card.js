const EDITOR_SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "vacuum" } } },
  { name: "name", selector: { text: {} } },
  { name: "battery_entity", selector: { entity: { domain: "sensor" } } },
  { name: "duration_entity", selector: { entity: { domain: "sensor" } } },
  { name: "progress_entity", selector: { entity: { domain: "sensor" } } },
  { name: "room_entity", selector: { entity: { domain: "sensor" } } },
  { name: "last_clean_entity", selector: { entity: { domain: "sensor" } } }
];

const EDITOR_LABELS = {
  entity: "Entité vacuum (obligatoire)",
  name: "Nom affiché",
  battery_entity: "Capteur : niveau de batterie",
  duration_entity: "Capteur : durée du dernier nettoyage",
  progress_entity: "Capteur : pourcentage d'avancement",
  room_entity: "Capteur : pièce actuelle",
  last_clean_entity: "Capteur : fin du dernier nettoyage"
};

class RoborockStatusCardEditor extends HTMLElement {

  setConfig(config) {
    this._config = { scenes: [], error_checks: [], ...config };
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
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        .section {
          margin-bottom: 24px;
          padding: 16px;
          background: var(--secondary-background-color);
          border-radius: 8px;
          width: 100%;
          overflow: hidden;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin-bottom: 16px;
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-bottom: 12px;
          padding: 8px;
          background: var(--card-background-color);
          border-radius: 4px;
          border-left: 3px solid var(--primary-color);
        }
        .scene-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 12px;
          padding: 12px;
          background: var(--card-background-color);
          border-radius: 6px;
          width: 100%;
        }
        .check-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
          padding: 12px;
          background: var(--card-background-color);
          border-radius: 6px;
          border-left: 3px solid var(--primary-color);
          width: 100%;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color);
        }
        .text-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--primary-background-color, var(--card-background-color));
          color: var(--primary-text-color);
          font-family: inherit;
          font-size: 14px;
          padding: 10px 12px;
        }
        .text-input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .check-row-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
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
          padding: 8px 12px;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .remove-btn {
          color: var(--error-color, #db4437);
        }
        .remove-btn:hover {
          background: var(--error-color, #db4437);
          color: white;
        }
        .use-current-btn {
          padding: 8px 12px;
          color: var(--primary-color);
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .use-current-btn:hover {
          background: var(--primary-color);
          color: white;
        }
        .add-btn {
          width: 100%;
          margin-top: 8px;
          background: var(--primary-color);
          color: white;
          border: none;
        }
        .add-btn:hover {
          opacity: 0.9;
        }
        .ok-select {
          min-height: 40px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 13px;
          padding: 8px 12px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        ha-entity-picker {
          width: 100%;
          min-width: 0;
        }
        ha-icon-picker {
          width: 100%;
          min-width: 0;
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
      const error_checks = [...(this._config.error_checks || []), { entity: "", ok_state: "OK", name: "", error_message: "" }];
      this._emitChange({ ...this._config, error_checks });
      this._renderChecks();
    });
  }

  _labeledField(labelText, controlEl) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.className = "field-label";
    label.textContent = labelText;
    wrap.appendChild(label);
    wrap.appendChild(controlEl);
    return wrap;
  }

  _createTextInput(value, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "text-input";
    input.value = value || "";
    if (placeholder) input.placeholder = placeholder;
    return input;
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

      const nameField = this._createTextInput(scene.name, "Ex : Nettoyer le salon");
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
      removeBtn.innerHTML = '<ha-icon icon="mdi:delete-outline"></ha-icon><span>Supprimer</span>';
      removeBtn.addEventListener("click", () => {
        const scenes = [...this._config.scenes];
        scenes.splice(index, 1);
        this._emitChange({ ...this._config, scenes });
        this._renderScenes();
      });

      row.appendChild(picker);
      row.appendChild(this._labeledField("Nom", nameField));
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

      const nameField = this._createTextInput(check.name, "Ex : Erreur du dock");
      nameField.addEventListener("change", (ev) => {
        this._patchCheck(index, { name: ev.target.value });
      });

      const currentState = check.entity && this._hass ? this._hass.states[check.entity] : null;
      const options = new Set();
      if (check.ok_state) options.add(check.ok_state);
      if (currentState) options.add(currentState.state);
      if (check.entity && check.entity.startsWith("binary_sensor.")) {
        options.add("on");
        options.add("off");
      }
      ["OK", "Aucun", "Problème", "Erreur", "Attaché", "Détaché"].forEach((o) => options.add(o));

      const okSelect = document.createElement("select");
      okSelect.className = "ok-select";
      okSelect.title = "État normal";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "État normal…";
      placeholder.disabled = true;
      okSelect.appendChild(placeholder);
      options.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.textContent = opt;
        okSelect.appendChild(optionEl);
      });
      okSelect.value = check.ok_state || "";
      okSelect.addEventListener("change", (ev) => {
        this._patchCheck(index, { ok_state: ev.target.value });
      });

      const errorMessageField = this._createTextInput(check.error_message, "Ex : Le réservoir d'eau sale est plein");
      errorMessageField.addEventListener("change", (ev) => {
        this._patchCheck(index, { error_message: ev.target.value });
      });

      const useCurrentBtn = document.createElement("button");
      useCurrentBtn.className = "use-current-btn";
      useCurrentBtn.title = "Utiliser l'état actuel comme état normal";
      useCurrentBtn.innerHTML = '<ha-icon icon="mdi:target"></ha-icon>';
      useCurrentBtn.addEventListener("click", () => {
        if (!currentState) return;
        this._patchCheck(index, { ok_state: currentState.state });
        this._renderChecks();
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = '<ha-icon icon="mdi:delete-outline"></ha-icon><span>Supprimer cette vérification</span>';
      removeBtn.addEventListener("click", () => {
        const error_checks = [...this._config.error_checks];
        error_checks.splice(index, 1);
        this._emitChange({ ...this._config, error_checks });
        this._renderChecks();
      });

      // Disposition en colonne unique : chaque champ est étiqueté et pleine largeur,
      // ce qui évite que les champs se retrouvent écrasés/invisibles sur un panneau étroit.
      const okSelectWrap = this._labeledField("État normal", okSelect);
      okSelectWrap.appendChild(useCurrentBtn);
      useCurrentBtn.style.marginTop = "4px";

      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "check-row-buttons";
      buttonsDiv.appendChild(removeBtn);

      row.appendChild(picker);
      row.appendChild(this._labeledField("Libellé", nameField));
      row.appendChild(okSelectWrap);
      row.appendChild(this._labeledField("Message d'erreur", errorMessageField));
      row.appendChild(buttonsDiv);
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
      battery_entity: "",
      duration_entity: "",
      progress_entity: "",
      room_entity: "",
      last_clean_entity: "",
      scenes: [],
      error_checks: [
        { entity: "", ok_state: "OK", name: "Erreur du dock", error_message: "" },
        { entity: "", ok_state: "OK", name: "Réservoir d'eau sale", error_message: "" },
        { entity: "", ok_state: "OK", name: "Réservoir d'eau propre", error_message: "" },
        { entity: "", ok_state: "Aucun", name: "Erreur de l'aspirateur", error_message: "" },
        { entity: "", ok_state: "OK", name: "Pénurie d'eau", error_message: "" },
        { entity: "", ok_state: "Attaché", name: "Réservoir d'eau fixé", error_message: "" },
        { entity: "", ok_state: "Attachée", name: "Serpillière fixée", error_message: "" }
      ]
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

  _renderDurationProgressPill() {
    const durationSt = this._state(this._config.duration_entity);
    const progressSt = this._state(this._config.progress_entity);

    let value = "—";
    if (durationSt && progressSt) {
      value = `${this._formatDuration(durationSt)} (${this._formatPercentage(progressSt)})`;
    } else if (durationSt) {
      value = this._formatDuration(durationSt);
    } else if (progressSt) {
      value = this._formatPercentage(progressSt);
    }

    return `
      <div class="pill">
        <div class="pill-label">Durée</div>
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

  _formatPercentage(st) {
    const num = parseFloat(st.state);
    if (isNaN(num)) return st.state;
    return `${Math.round(num)}%`;
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

  _getBatteryPercentage() {
    if (this._config.battery_entity) {
      const batteryState = this._state(this._config.battery_entity);
      if (batteryState) {
        const percentage = parseFloat(batteryState.state);
        if (!isNaN(percentage)) return percentage;
      }
    }
    // Repli sur l'attribut battery_level du vacuum si pas de capteur dédié
    // (ou si le capteur configuré n'a pas encore d'état valide)
    const vacuum = this._state(this._config.entity);
    if (vacuum && vacuum.attributes.battery_level != null) {
      return vacuum.attributes.battery_level;
    }
    return null;
  }

  _getBatteryIcon() {
    const percentage = this._getBatteryPercentage();
    if (percentage === null) return "mdi:battery-unknown";

    const vacuum = this._state(this._config.entity);
    // Le robot est considéré "en charge" quand il est retourné au dock
    // et que la batterie n'est pas encore pleine.
    const isCharging = !!vacuum && vacuum.state === "docked" && percentage < 100;

    // Palier par tranche de 10% pour un rendu vraiment progressif
    const step = Math.min(100, Math.max(0, Math.round(percentage / 10) * 10));

    if (isCharging) {
      if (step <= 0) return "mdi:battery-charging-outline";
      if (step >= 100) return "mdi:battery-charging";
      return `mdi:battery-charging-${step}`;
    }

    if (step <= 10) return "mdi:battery-alert";
    if (step >= 100) return "mdi:battery";
    return `mdi:battery-${step}`;
  }

  _renderErrorChecks() {
    const checks = this._config.error_checks || [];
    const alerts = checks
      .map((check) => {
        const st = this._state(check.entity);
        if (!st || check.ok_state == null) return null;
        if (st.state === check.ok_state) return null;
        const label = check.error_message || check.name || st.attributes.friendly_name || check.entity;
        return `
          <div class="warning">
            <ha-icon icon="mdi:alert"></ha-icon>
            <span>${label} : ${st.state}</span>
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

    // Obtenir le pourcentage de batterie une seule fois
    const batteryPercentage = this._getBatteryPercentage();
    let battery = "—";
    if (batteryPercentage !== null) {
      battery = `${batteryPercentage}%`;
    }

    const isCleaning = vacuum && vacuum.state === "cleaning";
    const batteryIcon = this._getBatteryIcon();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
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
          min-width: 0;
        }
        .name-row ha-icon {
          --mdc-icon-size: 24px;
          color: var(--primary-color);
        }
        .titles {
          min-width: 0;
        }
        .titles .name {
          font-size: 15px;
          font-weight: 500;
          color: var(--primary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          flex-shrink: 0;
        }
        .battery ha-icon {
          --mdc-icon-size: 20px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }
        .pill {
          background: var(--secondary-background-color);
          border-radius: 8px;
          padding: 8px 6px;
          text-align: center;
          min-width: 0;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          flex-shrink: 0;
        }
        .scenes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
          min-width: 0;
        }
        .scene-btn:active, .action-btn:active {
          opacity: 0.7;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          flex: 1;
          min-width: 0;
        }
        .action-btn.primary {
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border: none;
        }
        .action-btn ha-icon, .scene-btn ha-icon {
          --mdc-icon-size: 16px;
          flex-shrink: 0;
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
            <ha-icon icon="${batteryIcon}"></ha-icon>${battery}
          </div>
        </div>

        <div class="grid">
          ${this._renderDurationProgressPill()}
          ${this._renderPill("Pièce", this._config.room_entity)}
          ${this._renderPill("Dernier passage", this._config.last_clean_entity, (st) => this._formatTimestamp(st))}
        </div>

        ${this._renderErrorChecks()}

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
