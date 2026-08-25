# Roborock status card

Carte Lovelace compacte pour piloter et surveiller un robot Roborock dans Home Assistant : statut, batterie, durée du dernier nettoyage, pièce actuelle, alertes (réservoir, erreurs), boutons de scènes, et démarrage/pause/retour à la base.

## Installation via HACS

1. Dans Home Assistant, ouvre **HACS**.
2. Menu ⋮ (en haut à droite) > **Dépôts personnalisés**.
3. Ajoute l'URL de ce dépôt GitHub, catégorie **Dashboard** (Plugin).
4. Recherche "Roborock status card" dans HACS et installe-la.
5. Si la ressource n'est pas ajoutée automatiquement : **Paramètres > Tableaux de bord > Ressources**, ajoute `/hacsfiles/roborock-status-card/roborock-status-card.js` en type **Module JavaScript**.
6. Recharge la page (Ctrl+Maj+R).

## Utilisation

### Via l'interface graphique

Ajoute une carte, choisis **"Roborock status card"** dans la liste, puis renseigne les champs (entité vacuum, capteurs, seuils d'alerte) et ajoute tes boutons de scènes directement depuis le formulaire — aucun YAML à écrire.

### Via YAML

Ajoute une carte **Manuel** dans ton tableau de bord avec la configuration suivante (adapte les `entity_id` aux tiens) :

```yaml
type: custom:roborock-status-card
entity: vacuum.nestor_ii
duration_entity: sensor.nestor_ii_duree_de_nettoyage
room_entity: sensor.nestor_ii_piece_actuelle
last_clean_entity: sensor.nestor_ii_fin_du_dernier_nettoyage
scenes:
  - entity: button.nestor_ii_apres_les_repas
    name: Après les repas
    icon: mdi:silverware-fork-knife
  - entity: button.nestor_ii_balayage_cuisine
    name: Balayage cuisine
    icon: mdi:broom
  - entity: button.nestor_ii_complet_rapide
    name: Complet rapide
    icon: mdi:lightning-bolt
  - entity: button.nestor_ii_rdc
    name: RdC
    icon: mdi:stairs-up
error_checks:
  - entity: sensor.nestor_ii_erreur_de_dock
    name: Erreur du dock
    ok_state: "OK"
  - entity: sensor.nestor_ii_reservoir_d_eau_sale
    name: Réservoir d'eau sale
    ok_state: "OK"
  - entity: sensor.nestor_ii_reservoir_d_eau_propre
    name: Réservoir d'eau propre
    ok_state: "OK"
  - entity: sensor.nestor_ii_erreur_de_l_aspirateur
    name: Erreur de l'aspirateur
    ok_state: "Aucun"
  - entity: sensor.nestor_ii_penurie_d_eau
    name: Pénurie d'eau
    ok_state: "OK"
  - entity: binary_sensor.nestor_ii_reservoir_d_eau_fixe
    name: Réservoir d'eau fixé
    ok_state: "Attaché"
  - entity: binary_sensor.nestor_ii_serpilliere_fixee
    name: Serpillière fixée
    ok_state: "Attachée"
```

### Options

| Clé | Obligatoire | Description |
|---|---|---|
| `entity` | oui | Entité `vacuum.*` du robot |
| `name` | non | Nom affiché (par défaut : nom de l'entité) |
| `duration_entity` | non | Capteur durée du dernier nettoyage (la valeur est automatiquement arrondie à la minute) |
| `room_entity` | non | Capteur pièce actuelle |
| `last_clean_entity` | non | Capteur fin du dernier nettoyage |
| `scenes` | non | Liste de boutons (`entity`, `name`, `icon`) reliés à des entités `button.*` |
| `error_checks` | non | Liste de vérifications (`entity`, `name`, `ok_state`). Un message n'apparaît que si l'état du capteur diffère de `ok_state`. |

Ajoute autant de `error_checks` que nécessaire (dock, réservoirs, pénurie d'eau, fixation des accessoires, etc.) : la carte reste vide de toute alerte tant que tout va bien, et n'affiche que les lignes en anomalie.
