async function InitializeDBforCRM(pool) {
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
            FOREIGN KEY (companie_id) REFERENCES S10_Companii(id) ON DELETE RESTRICT,
            
        -- Nota: Daca ai tabelele S10_Filiale si S10_Santiere create, poti decomenta liniile de mai jos:
        CONSTRAINT fk_contacte_filiala FOREIGN KEY (filiala_id) REFERENCES S10_Filiale(id) ON DELETE SET NULL,
        CONSTRAINT fk_contacte_santier FOREIGN KEY (santier_id) REFERENCES S01_Santiere(id) ON DELETE SET NULL,

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

  // scope_type = nivelul pe care vrei să-l vezi ca prim badge/context
  // entity_type = obiectul exact care a fost creat/editat/șters
  // parent_type = părintele direct al entity-ului, dacă există

  // 1. TABEL ISTORIC (S11_Istoric)
  const createHistoryTable = `
    CREATE TABLE IF NOT EXISTS S11_Istoric (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Cine a făcut acțiunea
        utilizator_id INT NOT NULL,

        -- Compania mare unde se afișează istoricul
        companie_id INT NOT NULL,

        -- Contextul principal pentru primul badge:
        -- exemple:
        -- nivel_tip = 'companie', nivel_id = 7
        -- nivel_tip = 'filiala',  nivel_id = 3
        -- nivel_tip = 'santier',  nivel_id = 44
        -- nivel_tip = 'contact',  nivel_id = 21
        nivel_tip VARCHAR(50) NOT NULL,
        nivel_id INT NOT NULL,

        -- Obiectul exact afectat:
        -- exemple:
        -- entitate_tip = 'companie',    entitate_id = 7
        -- entitate_tip = 'filiala',     entitate_id = 3
        -- entitate_tip = 'santier',     entitate_id = 44
        -- entitate_tip = 'contact',     entitate_id = 21
        -- entitate_tip = 'activitate',  entitate_id = 15
        -- entitate_tip = 'comentariu',  entitate_id = 88
        entitate_tip VARCHAR(50) NOT NULL,
        entitate_id INT NOT NULL,

        -- Părintele direct, dacă există:
        -- activitate pe șantier:
        -- parinte_tip = 'santier', parinte_id = 44
        --
        -- comentariu la activitate:
        -- parinte_tip = 'activitate', parinte_id = 15
        --
        -- filiala în companie:
        -- parinte_tip = 'companie', parinte_id = 7
        parinte_tip VARCHAR(50) NULL,
        parinte_id INT NULL,

        -- Acțiune generală pentru badge-uri / filtre
        -- exemple:
        -- 'adaugare', 'editare', 'stergere', 'mentiune', 'upload', 'schimbare_status', 'atribuire'
        actiune_tip VARCHAR(50) NOT NULL,

        -- Display direct în frontend
        titlu VARCHAR(255) NOT NULL,
        mesaj TEXT NULL,

        -- Accent vizual
        severitate ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',

        -- Diff / snapshot / payload tehnic
        -- exemple:
        -- { "Telefon": { "vechi": "123", "nou": "456" } }
        -- { "Activitate": "text..." }
        -- { "Comentariu": "text..." }
        detalii JSON NULL,

        -- Mențiuni ca snapshot istoric
        -- exemplu:
        -- [
        --   { "id": 4, "nume": "Maria Popescu", "poza": "uploads/..." },
        --   { "id": 9, "nume": "Ion Ionescu", "poza": "uploads/..." }
        -- ]
        mentiuni JSON NULL,

        creat_la TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_istoric_companie (companie_id),
        INDEX idx_istoric_companie_creat_la (companie_id, creat_la DESC),

        INDEX idx_istoric_nivel (nivel_tip, nivel_id),
        INDEX idx_istoric_companie_nivel_creat_la (companie_id, nivel_tip, nivel_id, creat_la DESC),

        INDEX idx_istoric_entitate (entitate_tip, entitate_id),
        INDEX idx_istoric_parinte (parinte_tip, parinte_id),

        INDEX idx_istoric_utilizator (utilizator_id),
        INDEX idx_istoric_actiune_tip (actiune_tip),
        INDEX idx_istoric_creat_la (creat_la DESC),

        CONSTRAINT fk_istoric_utilizator
            FOREIGN KEY (utilizator_id)
            REFERENCES S00_Utilizatori(id)
            ON DELETE RESTRICT,

        CONSTRAINT fk_istoric_companie
            FOREIGN KEY (companie_id)
            REFERENCES S10_Companii(id)
            ON DELETE RESTRICT
            

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  await pool.execute(createHistoryTable);
  console.log("Tabela S11_Istoric creată.");
  // 2. TABEL NOTIFICĂRI (S11_Notificari)

  const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS S11_Notificari (
            id INT AUTO_INCREMENT PRIMARY KEY,

            utilizator_id INT NOT NULL,
            istoric_id INT NOT NULL,

            mesaj VARCHAR(512) NOT NULL,

            citit_la TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_notificari_istoric
                FOREIGN KEY (istoric_id)
                REFERENCES S11_Istoric(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_notificari_utilizator
                FOREIGN KEY (utilizator_id)
                REFERENCES S00_Utilizatori(id)
                ON DELETE CASCADE,

            INDEX idx_notificari_utilizator_necitite (utilizator_id, citit_la, created_at),
            INDEX idx_notificari_istoric (istoric_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `;
  await pool.execute(createNotificationsTable);
  console.log("Tabela S11_Notificari creată.");

  // 1. TABEL ACTIVITĂȚI (S11_Activitati)
  const createActivitatiTable = `
            CREATE TABLE IF NOT EXISTS S11_Activitati (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- Contextul activității (unde a fost adăugată)
                companie_id INT NOT NULL,
                filiala_id INT NULL,
                santier_id INT NULL,
                contact_id INT NULL,
                
                -- Conținut
                mesaj TEXT NOT NULL,
                
                -- Autor și Timestamp
                created_by_user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                edited_by_user_id INT NULL,
                edited_at TIMESTAMP NULL,

                -- Indecși pentru o filtrare rapidă în meniul din stânga
                INDEX idx_activitati_companie (companie_id),
                INDEX idx_activitati_filtrari (filiala_id, santier_id, contact_id),
                INDEX idx_activitati_ordonare (created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `;
  await pool.execute(createActivitatiTable);
  console.log("Tabela S11_Activitati creată.");

  // 2. TABEL COMENTARII ACTIVITĂȚI (S11_Activitati_Comentarii)
  const createComentariiTable = `
            CREATE TABLE IF NOT EXISTS S11_Activitati_Comentarii (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- Legătura cu activitatea părinte
                activitate_id INT NOT NULL,
                
                -- Conținut
                mesaj TEXT NOT NULL,
                
                -- Autor și Timestamp
                created_by_user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                edited_by_user_id INT NULL,
                edited_at TIMESTAMP NULL,

                -- Cheie străină care șterge automat comentariile dacă activitatea e ștearsă
                CONSTRAINT fk_comentarii_activitati 
                    FOREIGN KEY (activitate_id) 
                    REFERENCES S11_Activitati(id) 
                    ON DELETE CASCADE,

                -- Index pentru încărcarea rapidă a comentariilor când dai click pe "Săgeată în jos"
                INDEX idx_comentarii_activitate_id (activitate_id, created_at ASC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `;
  await pool.execute(createComentariiTable);
  console.log("Tabela S11_Activitati_Comentarii creată.");
}

module.exports = InitializeDBforCRM;
