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

        email                     VARCHAR(255) NULL,
        telefon                   VARCHAR(50)  NULL,

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

  // --- 2. FILIALE (NEW TABLE) ---
  const createFilialeTable = `
        CREATE TABLE IF NOT EXISTS S10_Filiale (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Hierarchy
        companie_id             INT NOT NULL,
        
        -- Details
        nume_filiala            VARCHAR(255) NOT NULL,
        tip_unitate             VARCHAR(50) NOT NULL DEFAULT 'Filiale', -- Filiale / Directie
        
        tara                    VARCHAR(100) NOT NULL DEFAULT 'Romania',
        regiune                 VARCHAR(100) NULL,
        oras                    VARCHAR(100) NULL,
        
        longitudine             DECIMAL(10, 7) NULL,
        latitudine             DECIMAL(10, 7) NULL,

        nivel_decizie           VARCHAR(50) NOT NULL DEFAULT 'Regional', -- Local / Regional / National
        
        telefon                 VARCHAR(50) NULL,
        email                   VARCHAR(255) NULL,
        note                    TEXT NULL,

        -- Audit
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id      INT NULL,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_user_id      INT NULL,

        -- Constraints
        CONSTRAINT fk_filiale_companie FOREIGN KEY (companie_id) REFERENCES S10_Companii(id) ON DELETE RESTRICT,

        -- Indexes
        INDEX idx_filiale_companie (companie_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
  await pool.execute(createFilialeTable);
  console.log("Table S10_Filiale created or already exists.");

  const createSantiereTableQuery = `
        CREATE TABLE IF NOT EXISTS S01_Santiere (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Identification
        nume VARCHAR(100) NOT NULL,
        culoare_hex CHAR(7) NOT NULL DEFAULT '#FFFFFF',
        
        -- Hierarchy
        companie_id INT NOT NULL,
        filiala_id INT NULL,

        -- Status & Dates
        activ TINYINT(1) NOT NULL DEFAULT 1, -- cleaner than tinyint
        notita TEXT NULL,
        data_inceput DATE NULL,
        data_sfarsit DATE NULL,

        -- Location (Optimized for Maps)
        adresa VARCHAR(255) NULL,
        longitudine DECIMAL(10, 7) NULL, -- Standard GPS precision
        latitudine DECIMAL(10, 7)  NULL, -- Standard GPS precision

        -- Audit
        created_by_user_id INT NULL,
        updated_by_user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Constraints
        CONSTRAINT fk_santiere_companie FOREIGN KEY (companie_id) REFERENCES S10_Companii(id) ON DELETE RESTRICT,
        CONSTRAINT fk_santiere_filiala FOREIGN KEY (filiala_id) REFERENCES S10_Filiale(id) ON DELETE SET NULL,

        -- Indexes for performance
        INDEX idx_santiere_companie (companie_id)
        -- INDEX idx_santiere_filiala (filiala_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

  await pool.execute(createSantiereTableQuery);
  console.log("S01_Santiere table created or already exists.");

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

  // 1. TABEL ISTORIC (S11_Istoric)
  const createHistoryTable = `
            CREATE TABLE IF NOT EXISTS S11_Istoric (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- Cine a făcut acțiunea
                utilizator_id INT NOT NULL,
                
                -- Ce s-a întâmplat (Display)
                titlu VARCHAR(255) NOT NULL,       -- ex: "Actualizare Contact"
                mesaj TEXT NULL,                   -- ex: "Ion Popescu a modificat telefonul..."
                severitate ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',

                -- Tehnic (Pt. Cod/Filtrare)
                actiune VARCHAR(100) NOT NULL,     -- ex: "edit", "delete", "upload"

                -- Ierarhia (Entitate & Rădăcină)
                tip_entitate VARCHAR(50) NOT NULL, -- ex: "contact"
                entitate_id INT NOT NULL,
                
                radacina_tip VARCHAR(50) NULL,     -- ex: "companie"
                radacina_id INT NULL,

                -- Payload-ul (Datele brute/Diff)
                detalii JSON NULL, 

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Indexuri pentru performanță
                INDEX idx_istoric_entitate (tip_entitate, entitate_id),
                INDEX idx_istoric_radacina (radacina_tip, radacina_id),
                INDEX idx_istoric_utilizator (utilizator_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `;
  await pool.execute(createHistoryTable);
  console.log("Tabela S11_Istoric creată.");

  // 2. TABEL NOTIFICĂRI (S11_Notificari)
  const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS S11_Notificari (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- Cine primește notificarea
                utilizator_id INT NOT NULL,
                
                -- Legătură cu istoricul
                istoric_id INT NOT NULL,
                
                -- Copie pentru afișare rapidă în clopoțel
                mesaj VARCHAR(512) NOT NULL,
                actiune VARCHAR(100) NOT NULL,     
                severitate ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
                
                -- Navigare rapidă (opțional, dar util în frontend)
                tip_entitate VARCHAR(50) NULL,
                entitate_id INT NULL,

                -- Status
                citit_la TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_notificari_istoric FOREIGN KEY (istoric_id) REFERENCES S11_Istoric(id) ON DELETE CASCADE,

                INDEX idx_notificari_utilizator_necitite (utilizator_id, citit_la, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
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
