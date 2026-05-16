# Architecture de Securite - Hotel Smart Concierge

Ce document decrit les mesures de securite implementees dans le backend de l'application Hotel Smart Concierge.

## 1. Authentification & Autorisation (RBAC)

### JSON Web Tokens (JWT)
Le systeme utilise des tokens JWT pour l'authentification :
- **Staff (Admin, Receptionist, Managers)** : Utilisation de tokens standards avec `userId` et `role`.
- **Mobile (Employees)** : Les employes utilisent egalement JWT, mais leurs permissions sont limitees aux actions mobiles liees a leurs taches assignees.

### Role-Based Access Control (RBAC)
L'acces aux endpoints est securise par un middleware `requireRole` :
- `ADMIN` : Acces complet.
- `RECEPTIONIST` : Acces aux reservations, check-in, et assignation generique.
- `MAINTENANCE_MANAGER` / `HOUSEKEEPING_MANAGER` : Acces restreint a leur departement (ex: ne voient que les employes de maintenance, ne peuvent assigner que des taches de maintenance).
- `EMPLOYEE` : Acces aux API mobiles uniquement.

## 2. Securite des Tokens QR

Le systeme utilise deux types de tokens QR distincts pour garantir la securite des acces :

### QR Client Signe (`X-Client-Room-Token`)
- **Usage** : Permet au client d'acceder a l'application de sa chambre (demandes de room service, reclamations).
- **Expiration** : Le token est signe cryptographiquement et **expire automatiquement a la date et l'heure du check-out**.
- **Contrainte** : Le token verifie si le statut de la reservation est bien `CHECKED_IN`.

### QR Employe Signe (Worker QR)
- **Usage** : Permet aux employes de scanner l'entree et la sortie de la chambre pour leurs interventions.
- **Versionning** : Ce token n'expire pas au temps, mais est lie a une **version** en base de donnees (`workerQrVersion`).
- **Revocation** : Si l'acces doit etre revoque ou que le QR physique est remplace, la version est incrementee, invalidant immediatement l'ancien token.

## 3. Chiffrement des Donnees Sensibles

### Passeports et Documents
Lors du pre-check-in, les numeros de passeport des clients sont chiffres en base de donnees (via l'algorithme `AES-256-CBC`).
Le `FIELD_ENCRYPTION_KEY` defini dans l'environnement est utilise pour chiffrer ces donnees au repos. 

### Mots de passe
Les mots de passe des utilisateurs sont haches avec `bcrypt` (10 rounds de sel). Le hachage (`passwordHash`) n'est **jamais** renvoye dans les reponses de l'API.

## 4. Protection contre les Attaques

### HTTP Security Headers (Helmet)
Le middleware `helmet` est active pour proteger contre les vulnerabilites courantes en configurant des en-tetes HTTP securises (protection XSS, interdiction d'iframe, etc.).

### Cross-Origin Resource Sharing (CORS)
CORS est configure pour n'accepter que les requetes provenant de l'URL precisee dans la variable `FRONTEND_URL`.

### Rate Limiting (Protection DDOS / Bruteforce)
- **Global** : 100 requetes par 15 minutes par IP.
- **Routes Publiques** : Un limiteur specifique plus strict (30 requetes par 15 minutes) est applique aux API exposees publiquement (pre-check-in client, reclamations, etc.) pour eviter l'abus.
- **Validation** : Les entrees utilisateurs sont validees via `express-validator` pour prevenir les injections.

## 5. Tracabilite et Audit (Audit Logs)

Toutes les actions critiques effectuees par le staff ou les clients sont tracees dans la table `AuditLog` :
- Creation/Modification/Suppression de chambres ou de reservations.
- Modification des profils employes.
- Transitions d'etats des reclamations (CONFIRMED, REOPENED, ASSIGNED).
- Interventions dans les chambres (Entry/Exit par les employes).
- Changements des configurations de l'hotel (devises, infos).

Chaque entree inclut l'`actorId` (l'utilisateur ou "CLIENT"), l'entite modifiee, et les details (metadata) de l'operation.
