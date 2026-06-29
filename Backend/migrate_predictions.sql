-- Migration : Adapter la table predictions pour le formulaire manuel du technicien
-- Supprimer les colonnes IA inutilisées et ajouter les nouveaux champs métier

ALTER TABLE predictions
  DROP COLUMN IF EXISTS risk_score,
  DROP COLUMN IF EXISTS prediction,
  DROP COLUMN IF EXISTS observation,
  ADD COLUMN IF NOT EXISTS risk_level ENUM('Faible', 'Moyen', 'Élevé') NOT NULL DEFAULT 'Faible' AFTER equipment_id,
  ADD COLUMN IF NOT EXISTS estimated_failure_date DATE NOT NULL AFTER risk_level,
  ADD COLUMN IF NOT EXISTS justification TEXT NOT NULL AFTER estimated_failure_date;
