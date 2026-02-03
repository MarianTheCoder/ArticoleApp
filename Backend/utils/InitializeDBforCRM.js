
async function InitializeDBforCRM(pool) {
    const creatCompaniesTable = `
        CREATE TABLE IF NOT EXISTS S10_Companii (
        id                        INT AUTO_INCREMENT PRIMARY KEY,

        logo_url                  VARCHAR(255) NULL,
        nume_companie             VARCHAR(255) NOT NULL,
        grup_companie             VARCHAR(255) NULL,
        domeniu_unitate_afaceri   VARCHAR(150) NULL,
        forma_juridica            VARCHAR(80)  NULL,

        tara                      CHAR(2) NOT NULL DEFAULT 'FR',
        regiune                   VARCHAR(120) NULL,
        oras                      VARCHAR(120) NULL,
        adresa                    VARCHAR(255) NULL,
        cod_postal                VARCHAR(16)  NULL,
        website                   VARCHAR(255) NULL,

        nivel_strategic           VARCHAR(20) NOT NULL DEFAULT 'Tinta',
        status_relatie            VARCHAR(20) NOT NULL DEFAULT 'Prospect',
        nivel_risc                VARCHAR(20) NOT NULL DEFAULT 'Mediu',

        nda_semnat                BOOLEAN NOT NULL DEFAULT FALSE,
        scor_conformitate         INT NOT NULL DEFAULT 0,
        utilizator_responsabil_id INT NULL,

        note                      TEXT NULL,

        created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id        INT NULL,
        updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id        INT NULL,

        CHECK (scor_conformitate BETWEEN 0 AND 100),

        -- Indexuri
        INDEX idx_companii_nume (nume_companie),
        INDEX idx_companii_grup (grup_companie),
        INDEX idx_companii_responsabil (utilizator_responsabil_id),

        -- Unicitate (nume + tara + oras)
        UNIQUE KEY uq_companii_nume_tara_oras (nume_companie, tara, oras)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.execute(creatCompaniesTable);
    console.log("Table S10_Companii created or already exists.");

    const createContactsTable = `
        CREATE TABLE IF NOT EXISTS S10_Contacte (
        id                        INT AUTO_INCREMENT PRIMARY KEY,

        logo_url                  VARCHAR(255) NULL,
        companie_id               INT NOT NULL,
        filiala_id                INT NULL, -- Legatura optionala cu Filiale
        santier_id                INT NULL, -- Legatura optionala cu Santiere

        prenume                   VARCHAR(100) NOT NULL,
        nume                      VARCHAR(100) NOT NULL,
        functie                   VARCHAR(150) NOT NULL, -- Ex: Manager Proiect, Director Achizitii
        categorie_rol             VARCHAR(100) NOT NULL, -- Ex: Achizitii, Executie, Directiune, QHSE

        email                     VARCHAR(255) NULL,
        telefon                   VARCHAR(50)  NULL,
        linkedin_url              VARCHAR(255) NULL,

        putere_decizie            TINYINT NOT NULL DEFAULT 1 CHECK (putere_decizie BETWEEN 1 AND 5),
        nivel_influenta           TINYINT NOT NULL DEFAULT 1 CHECK (nivel_influenta BETWEEN 1 AND 5),
        
        canal_preferat            VARCHAR(50) NOT NULL DEFAULT 'Email', -- Email / Telefon / LinkedIn
        limba                     VARCHAR(10) NOT NULL DEFAULT 'RO',    -- RO / EN / FR
        
        activ                     BOOLEAN NOT NULL DEFAULT TRUE,
        note                      TEXT NULL,
        ultima_interactiune       DATETIME NULL,

        created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id        INT NULL,
        updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id        INT NULL,

        -- Chei Straine (Foreign Keys)
        CONSTRAINT fk_contacte_companie 
            FOREIGN KEY (companie_id) REFERENCES S10_Companii(id) ON DELETE CASCADE,
            
        -- Nota: Daca ai tabelele S10_Filiale si S10_Santiere create, poti decomenta liniile de mai jos:
        -- CONSTRAINT fk_contacte_filiala FOREIGN KEY (filiala_id) REFERENCES S10_Filiale(id) ON DELETE SET NULL,
        -- CONSTRAINT fk_contacte_santier FOREIGN KEY (santier_id) REFERENCES S10_Santiere(id) ON DELETE SET NULL,

        -- Indexuri
        INDEX idx_contacte_companie (companie_id),
        INDEX idx_contacte_nume (nume, prenume),
        INDEX idx_contacte_rol (categorie_rol),

        -- Unicitate: Nu poti avea acelasi email de doua ori in aceeasi companie (daca email-ul exista)
        UNIQUE KEY uq_contacte_companie_email (companie_id, email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.execute(createContactsTable);
    console.log("Table S10_Contacte created or already exists.");

    // ================= HISTORY TABLE =================
    const createHistoryTable = `
    CREATE TABLE IF NOT EXISTS S11_History (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,         -- company, filiala, santier, contact, etc.
        entity_id INT NOT NULL,                -- id of the entity that changed
        root_entity_type VARCHAR(50) NULL,        -- top-level entity type for hierarchy (optional)
        root_entity_id INT NULL,               -- top-level entity id for hierarchy (optional)
        action VARCHAR(20) NOT NULL,              -- added, edited, deleted
        user_id INT NOT NULL,                  -- who performed the action
        details JSON NULL,                        -- minimal info about change
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_history_root (root_entity_type, root_entity_id, created_at),
        INDEX idx_history_entity (entity_type, entity_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.execute(createHistoryTable);
    console.log("Table S11_History created or already exists.");

    // ================= NOTIFICATIONS TABLE =================
    const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS S11_Notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,                  -- who should get the notification
        history_id INT NOT NULL,               -- link to S10_History
        message VARCHAR(512) NOT NULL,            -- human-readable notification
        severity ENUM('low','normal','high') NOT NULL DEFAULT 'normal', -- severity/color
        entity_type VARCHAR(50) NULL,             -- optional convenience
        entity_id INT NULL,                    -- optional convenience
        read_at TIMESTAMP NULL,                   -- timestamp when read
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_notifications_history FOREIGN KEY (history_id) REFERENCES S11_History(id) ON DELETE CASCADE,

        INDEX idx_notifications_user_unread (user_id, read_at, created_at),
        INDEX idx_notifications_entity (entity_type, entity_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.execute(createNotificationsTable);
    console.log("Table S11_Notifications created or already exists.");
}

module.exports = InitializeDBforCRM;
