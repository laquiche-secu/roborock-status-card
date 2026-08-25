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

Ajoute une carte **Manuel** dans ton tableau de bord avec la configuration suivante (adapte les `entity_id` aux tiens) :

```yaml
type: custom:roborock-status-card
entity: vacuum.nestor_ii
duration_entity: sensor.nestor_ii_duree_de_nettoyage
room_entity: sensor.nestor_ii_piece_actuelle
last_clean_entity: sensor.nestor_ii_fin_du_dernier_nettoyage
water_entity: sensor.nestor_ii_reservoir_d_eau_propre
water_ok_state: "OK"
error_entity: sensor.nestor_ii_erreur_de_l_aspirateur
error_ok_state: "Aucun"
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
```

### Options

| Clé | Obligatoire | Description |
|---|---|---|
| `entity` | oui | Entité `vacuum.*` du robot |
| `name` | non | Nom affiché (par défaut : nom de l'entité) |
| `duration_entity` | non | Capteur durée du dernier nettoyage |
| `room_entity` | non | Capteur pièce actuelle |
| `last_clean_entity` | non | Capteur fin du dernier nettoyage |
| `water_entity` / `water_ok_state` | non | Capteur réservoir d'eau + état considéré normal |
| `error_entity` / `error_ok_state` | non | Capteur erreur aspirateur + état considéré normal |
| `scenes` | non | Liste de boutons (`entity`, `name`, `icon`) reliés à des entités `button.*` |

Les bandeaux d'alerte n'apparaissent que si l'état du capteur diffère de l'état "OK" renseigné.

## Publier ce dépôt sur GitHub

```bash
cd roborock-status-card
git init
git add .
git commit -m "Roborock status card v1.0.0"
git branch -M main
git remote add origin https://github.com/<ton-user>/roborock-status-card.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

HACS a besoin d'au moins une **release GitHub** (ou tag) publiée pour détecter une version.
