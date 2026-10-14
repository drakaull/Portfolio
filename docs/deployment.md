# Mettre le portfolio en ligne — guide pas à pas

> Ce guide est en français (seule exception dans la documentation du projet) : c'est celui que tu
> suis seul pour installer, mettre à jour et restaurer le site. La spec est dans
> [specs/17-deployment.md](../specs/17-deployment.md), la liste de contrôle dans
> [deployment-checklist.md](deployment-checklist.md).

**Conventions de ce guide**

- Un bloc qui commence par `PS>` se tape dans **PowerShell sur ton PC**. Un bloc qui commence par
  `$` se tape **sur le serveur** (après t'y être connecté en SSH). Ne recopie pas `PS>` ni `$`.
- `<IP>` est l'adresse IPv4 de ton serveur, donnée par OVH ; `<IPv6>` son adresse IPv6.
- Tout ce qui est secret (mots de passe, clés) reste sur ton PC ou sur le serveur : **jamais dans
  Git, jamais dans un chat**.
- Sur le serveur, les commandes `docker compose …` se lancent **depuis le dossier
  `~/portfolio/deploy`** (`cd ~/portfolio/deploy`), où se trouvent `compose.yaml` et `.env`.

## Sommaire

1. [Comment le site tourne](#1-comment-le-site-tourne)
2. [Créer ta clé SSH (avant de commander)](#2-créer-ta-clé-ssh-avant-de-commander)
3. [Commander chez OVHcloud](#3-commander-chez-ovhcloud)
4. [Première connexion et sécurisation du serveur](#4-première-connexion-et-sécurisation-du-serveur)
5. [Installer Docker](#5-installer-docker)
6. [Les noms de domaine (DNS)](#6-les-noms-de-domaine-dns)
7. [Installer le site](#7-installer-le-site)
8. [Remettre le contenu](#8-remettre-le-contenu)
9. [Les sauvegardes](#9-les-sauvegardes)
10. [Vérifications avant d'annoncer le site](#10-vérifications-avant-dannoncer-le-site)
11. [Mettre le site à jour](#11-mettre-le-site-à-jour)
12. [Restaurer une sauvegarde](#12-restaurer-une-sauvegarde)
13. [Dépannage](#13-dépannage)

---

## 1. Comment le site tourne

```
Visiteur ──HTTPS──▶ Caddy ──/api/…──▶ backend (FastAPI) ──▶ PostgreSQL
                      └── sert le site React (fichiers déjà construits)
```

Trois **conteneurs** Docker tournent sur le serveur, décrits dans
[deploy/compose.yaml](../deploy/compose.yaml) :

| Conteneur | Rôle |
|---|---|
| `caddy` | Le seul accessible depuis Internet (ports 80 et 443). Obtient et renouvelle **tout seul** les certificats HTTPS, sert le site, transmet `/api` au backend, ajoute les en-têtes de sécurité, redirige `.be` / `www` vers `https://leonard-fontaine.com`. |
| `backend` | Ton API FastAPI, en un seul processus. |
| `db` | PostgreSQL. N'a aucun accès à Internet ; seul le backend lui parle. |

Les données vivent dans des **volumes** Docker, qui survivent aux redémarrages et aux mises à jour :
`db-data` (la base), `storage` (CV et photo), `caddy-data` (certificats).

Les réglages et secrets sont dans **`deploy/.env` sur le serveur uniquement** (modèle commenté :
[deploy/.env.example](../deploy/.env.example)).

---

## 2. Créer ta clé SSH (avant de commander)

**SSH** te permet de piloter le serveur à distance. Au lieu d'un mot de passe, on utilise une
**paire de clés** :

- la **clé privée** (`id_ed25519`) reste sur ton PC — c'est elle qui prouve que c'est toi, ne la
  donne jamais à personne ;
- la **clé publique** (`id_ed25519.pub`) se dépose sur le serveur — elle peut être montrée sans
  risque.

```powershell
PS> ssh-keygen -t ed25519 -C "leonard-portfolio"
```

- « Enter file » : appuie sur Entrée (emplacement par défaut `C:\Users\leona\.ssh\id_ed25519`).
- « Enter passphrase » : choisis une **phrase de passe** (elle chiffre la clé privée : si ton PC
  était volé, la clé seule ne suffirait pas). Note-la dans ton gestionnaire de mots de passe.

Pour ne pas retaper la phrase à chaque connexion — et pour que la sauvegarde automatique puisse
utiliser la clé — on la confie à l'**agent SSH** de Windows, une fois pour toutes. Dans un
PowerShell **lancé en administrateur** :

```powershell
PS> Set-Service ssh-agent -StartupType Automatic
PS> Start-Service ssh-agent
```

Puis dans un PowerShell normal :

```powershell
PS> ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

Affiche ta clé **publique** (c'est elle qu'OVH demandera) :

```powershell
PS> Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

---

## 3. Commander chez OVHcloud

> Les écrans d'OVH changent souvent : on les parcourt ensemble le jour J. Ce qui compte :

1. **Créer le compte** OVHcloud (à ton nom, ta carte). Active la **double authentification** du
   compte dès le début (Mon compte → Sécurité) : c'est lui qui contrôle tes domaines.
2. **Commander le VPS** (gamme VPS, le plus petit modèle) :
   - système : **Ubuntu 24.04 LTS** ;
   - localisation : **France** (Gravelines, Roubaix ou Strasbourg) ;
   - clé SSH : colle ta **clé publique** (étape 2) ;
   - pas d'option payante de sauvegarde (on a notre propre système, étape 9).
3. **Commander les domaines** `leonard-fontaine.com` et `leonard-fontaine.be`. Laisse les
   **serveurs DNS d'OVH** (proposés par défaut). Active le **masquage des données personnelles**
   (WHOIS) s'il est proposé.
4. **L'e-mail** : regarde ce qu'OVH inclut avec le domaine ; il faut une adresse
   `contact@leonard-fontaine.com` avec un accès **SMTP** (serveur, port, identifiant, mot de passe)
   pour que le site puisse t'envoyer les messages du formulaire. Note ces informations dans ton
   gestionnaire de mots de passe.

À la livraison du VPS, OVH t'envoie son **adresse IPv4** (et IPv6) et le nom de l'utilisateur
(souvent `ubuntu`).

---

## 4. Première connexion et sécurisation du serveur

### 4.1 Se connecter

```powershell
PS> ssh ubuntu@<IP>
```

La première fois, SSH demande de confirmer l'empreinte du serveur : réponds `yes`. Tu es maintenant
**sur le serveur** (l'invite change).

### 4.2 Mettre le système à jour

```bash
$ sudo apt update && sudo apt full-upgrade -y
$ sudo reboot
```

`sudo` = « exécuter en administrateur ». Le serveur redémarre ; reconnecte-toi après une minute.

### 4.3 Ton propre utilisateur

On travaille avec un compte à ton nom plutôt qu'avec le compte générique :

```bash
$ sudo adduser leonard              # choisis un mot de passe (il servira pour sudo, pas pour SSH)
$ sudo usermod -aG sudo leonard     # leonard peut utiliser sudo
$ sudo mkdir -p /home/leonard/.ssh
$ sudo cp ~/.ssh/authorized_keys /home/leonard/.ssh/   # ta clé publique, déjà déposée par OVH
$ sudo chown -R leonard:leonard /home/leonard/.ssh
$ sudo chmod 700 /home/leonard/.ssh && sudo chmod 600 /home/leonard/.ssh/authorized_keys
```

**Dans un nouveau PowerShell** (garde l'ancienne session ouverte au cas où), vérifie :

```powershell
PS> ssh leonard@<IP>
```

### 4.4 Fermer la porte aux mots de passe

Une fois que `ssh leonard@<IP>` marche, on interdit les connexions par mot de passe et en `root` :

```bash
$ sudo tee /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
$ sudo sshd -t && sudo systemctl restart ssh
```

`sshd -t` vérifie la configuration avant de redémarrer (une erreur pourrait te couper l'accès).
Teste à nouveau `ssh leonard@<IP>` depuis un nouveau PowerShell **avant** de fermer l'ancienne
session.

### 4.5 Le pare-feu

Seules trois « portes » restent ouvertes : SSH (22), HTTP (80) et HTTPS (443) :

```bash
$ sudo ufw allow OpenSSH
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp
$ sudo ufw allow 443/udp
$ sudo ufw enable
$ sudo ufw status
```

> Docker ouvre lui-même les ports qu'un conteneur publie, sans passer par `ufw`. Dans notre
> configuration, seul Caddy publie des ports (80 et 443) : la base et le backend ne sont jamais
> exposés.

### 4.6 Mises à jour de sécurité automatiques

```bash
$ sudo apt install -y unattended-upgrades
$ sudo dpkg-reconfigure --priority=low unattended-upgrades    # réponds « Oui »
```

### 4.7 Un raccourci sur ton PC

Pour taper `ssh portfolio` au lieu de `ssh leonard@<IP>`, crée (ou complète) le fichier
`C:\Users\leona\.ssh\config` :

```
Host portfolio
  HostName <IP>
  User leonard
  IdentityFile ~/.ssh/id_ed25519
```

Ce raccourci sert aussi à la sauvegarde automatique (étape 9).

---

## 5. Installer Docker

On installe Docker depuis le dépôt officiel de Docker (méthode recommandée par Docker) :

```bash
$ sudo apt install -y ca-certificates curl
$ sudo install -m 0755 -d /etc/apt/keyrings
$ sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
$ echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
$ sudo apt update
$ sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
$ sudo usermod -aG docker leonard      # utiliser docker sans sudo
```

Déconnecte-toi (`exit`) puis reconnecte-toi (`ssh portfolio`) pour que le groupe soit pris en
compte, et vérifie : `docker run --rm hello-world`.

---

## 6. Les noms de domaine (DNS)

Le **DNS** est l'annuaire d'Internet : il dit à quelle adresse IP correspond chaque nom. Dans
l'espace client OVH → Domaines → `leonard-fontaine.com` → **Zone DNS**, crée (ou modifie) :

| Sous-domaine | Type | Cible |
|---|---|---|
| *(vide)* | `A` | `<IP>` |
| `www` | `A` | `<IP>` |
| *(vide)* | `AAAA` | `<IPv6>` |
| `www` | `AAAA` | `<IPv6>` |

Fais **la même chose** pour `leonard-fontaine.be`. Supprime les enregistrements `A`/`AAAA`
préexistants qui pointeraient ailleurs (page de parking OVH).

**E-mail** (sur `leonard-fontaine.com`), pour que les messages du formulaire ne finissent pas en
spam :

| Enregistrement | Rôle |
|---|---|
| `MX` | Où arrive le courrier (fourni par l'offre e-mail ; OVH le crée souvent tout seul). |
| `SPF` (`TXT` sur le domaine) | Liste des serveurs autorisés à envoyer pour ton domaine. Valeur donnée par OVH (du type `v=spf1 include:mx.ovh.com ~all`). |
| `DKIM` | Signature des e-mails envoyés ; s'active dans l'espace e-mail d'OVH, qui crée les enregistrements. |
| `DMARC` (`TXT` sur `_dmarc`) | Ce que les destinataires font d'un e-mail qui échoue SPF/DKIM. Pour commencer : `v=DMARC1; p=quarantine; rua=mailto:contact@leonard-fontaine.com` |

Les changements DNS prennent de quelques minutes à quelques heures. Pour vérifier depuis ton PC :

```powershell
PS> Resolve-DnsName leonard-fontaine.com
PS> Resolve-DnsName www.leonard-fontaine.be
```

**Attends que les quatre noms pointent vers `<IP>` avant l'étape 7** : Caddy demande les
certificats dès son démarrage, et Let's Encrypt limite le nombre d'essais ratés.

---

## 7. Installer le site

### 7.1 Récupérer le code

```bash
$ cd ~
$ git clone https://github.com/drakaull/Portfolio.git portfolio
$ cd portfolio
$ git checkout main
```

### 7.2 Les réglages et secrets

```bash
$ cd ~/portfolio/deploy
$ cp .env.example .env
$ chmod 600 .env                       # lisible par toi seul
$ openssl rand -hex 32                 # génère le mot de passe de la base : copie le résultat
$ nano .env
```

Dans `nano` (éditeur de texte simple ; `Ctrl+O` puis Entrée pour enregistrer, `Ctrl+X` pour
quitter), remplis :

- `POSTGRES_PASSWORD` : la valeur générée juste avant (jamais réutilisée ailleurs) ;
- `DEEPL_API_KEY` : ta clé DeepL (compte DeepL API Free) ;
- `CONTACT_EMAIL`, `SMTP_*` : les informations de l'offre e-mail (étape 3) ;
- vérifie les adresses (`SITE_ADDRESS`, `SITE_URL`, `REDIRECT_ADDRESSES`) et `ACME_EMAIL`.

### 7.3 Démarrer

```bash
$ docker compose up -d --build
```

La première fois, la construction prend quelques minutes. Ensuite :

```bash
$ docker compose ps                     # les trois services doivent être « running » / « healthy »
$ docker compose exec backend alembic upgrade head      # crée les tables
$ docker compose exec backend python -m app.cli create-admin --username leonard
```

`create-admin` te demande un mot de passe (deux fois) : c'est celui de **l'admin du site**, à
garder dans ton gestionnaire de mots de passe.

Ouvre **https://leonard-fontaine.com** : le cadenas doit être là.

---

## 8. Remettre le contenu

1. Connecte-toi à `https://leonard-fontaine.com/fr/admin`.
2. **Accueil** : textes, LinkedIn, GitHub, **photo** (et son cadrage), **CV** — la version sans
   téléphone ni date de naissance.
3. **Parcours**, **Compétences** : vérifie ou ressaisis.
4. **Projets** : « Synchroniser avec GitHub », puis choisis les projets visibles.
5. Remplis les traductions manquantes :

```bash
$ docker compose exec backend python -m app.cli translate-missing
```

---

## 9. Les sauvegardes

### 9.1 Sur le serveur, chaque nuit

```bash
$ sudo mkdir -p /var/backups/portfolio
$ sudo chown leonard:leonard /var/backups/portfolio
$ ~/portfolio/deploy/backup.sh          # un premier essai à la main
$ ls -lh /var/backups/portfolio
$ crontab -e                            # choisis nano si on te le demande
```

Ajoute cette ligne à la fin, enregistre et quitte (sauvegarde chaque nuit à 3 h 30) :

```
30 3 * * * /home/leonard/portfolio/deploy/backup.sh >> /home/leonard/backup.log 2>&1
```

Le serveur garde les **14** dernières sauvegardes ; les plus anciennes sont supprimées.

### 9.2 Sur ton PC, automatiquement

Le script [deploy/pull-backups.ps1](../deploy/pull-backups.ps1) télécharge les **8** dernières
sauvegardes dans `Documents\Sauvegardes portfolio` et garde un journal (`pull-backups.log`).

Essai à la main, depuis le dossier du projet :

```powershell
PS> powershell -ExecutionPolicy Bypass -File .\deploy\pull-backups.ps1
```

Puis enregistre la tâche planifiée (une seule fois) :

```powershell
PS> powershell -ExecutionPolicy Bypass -File .\deploy\pull-backups.ps1 -Install
```

Elle tourne chaque jour à midi, et à l'ouverture de session si ton PC était éteint. Pour vérifier
qu'elle tourne : ouvre `Documents\Sauvegardes portfolio\pull-backups.log` (une ligne `OK` par
jour), ou le **Planificateur de tâches** Windows → « Portfolio - backups ».

> La tâche utilise la clé confiée à l'agent SSH (étape 2) : si un jour le journal dit
> `FAILED: … Permission denied`, relance `ssh-add $env:USERPROFILE\.ssh\id_ed25519`.

### 9.3 Faire un test de restauration (une fois)

Une sauvegarde qui n'a jamais été restaurée n'est pas une sauvegarde : fais l'étape 12 une fois,
juste après la mise en ligne.

---

## 10. Vérifications avant d'annoncer le site

- [ ] `https://leonard-fontaine.com` s'ouvre avec le cadenas ; `http://`, `www.` et les deux
      adresses `.be` redirigent vers lui.
- [ ] https://www.ssllabs.com/ssltest/ : note **A** ou mieux.
- [ ] https://securityheaders.com : note **A** ou mieux.
- [ ] Les icônes et le manifest répondent (onglet, ajout à l'écran d'accueil d'un téléphone).
- [ ] Le formulaire de contact : un message de test arrive dans ta boîte (pas en spam).
- [ ] Connexion admin ; le message de test apparaît dans « Messages ».
- [ ] L'IP réelle des visiteurs : `docker compose logs backend | tail` doit montrer des adresses
      variées, pas toujours la même (sinon les limites anti-abus bloqueraient tout le monde).
- [ ] Les sauvegardes : une archive dans `/var/backups/portfolio`, une copie sur ton PC, un test
      de restauration réussi.
- [ ] La page Vie privée nomme OVHcloud et DeepL, et ne mentionne plus Gmail.

---

## 11. Mettre le site à jour

Quand une nouvelle version est mergée dans `main` :

```bash
$ ssh portfolio
$ cd ~/portfolio && git pull
$ cd deploy
$ docker compose up -d --build
$ docker compose exec backend alembic upgrade head     # sans effet s'il n'y a rien de nouveau
$ docker image prune -f                                # supprime les anciennes images
```

Le site reste en ligne pendant la construction ; il n'est coupé que quelques secondes, au moment
où les nouveaux conteneurs remplacent les anciens.

Pour mettre à jour **les images de base** (Python, Caddy, PostgreSQL…), on change leur version
dans le code (règle : publiées depuis au moins deux semaines), puis on suit la même procédure.

---

## 12. Restaurer une sauvegarde

> Remplace **toute** la base et les fichiers (CV, photo) par ceux de la sauvegarde. Ce qui a été
> fait depuis (messages reçus, modifications) est perdu.

Depuis une sauvegarde **du serveur** :

```bash
$ ls -lh /var/backups/portfolio
$ ~/portfolio/deploy/restore.sh /var/backups/portfolio/portfolio-2026-10-20_0330.tar.gz
```

Depuis une copie **de ton PC** (si le serveur a été réinstallé) — envoie-la d'abord :

```powershell
PS> scp "$env:USERPROFILE\Documents\Sauvegardes portfolio\portfolio-2026-10-20_0330.tar.gz" portfolio:/tmp/
```

```bash
$ ~/portfolio/deploy/restore.sh /tmp/portfolio-2026-10-20_0330.tar.gz
```

Le script demande de taper `yes` pour confirmer. Vérifie ensuite le site et l'admin.

---

## 13. Dépannage

| Symptôme | Où regarder |
|---|---|
| Le site ne répond pas | `docker compose ps` (un service arrêté ?), puis `docker compose logs --tail 50 caddy` et `… backend`. `docker compose up -d` relance ce qui est arrêté. |
| Erreur de certificat | `docker compose logs caddy` : le plus souvent, un nom de domaine ne pointe pas (encore) vers `<IP>` (étape 6). |
| « 502 » sur les pages qui chargent des données | Le backend est arrêté ou en erreur : `docker compose logs backend`. |
| Les e-mails du formulaire n'arrivent pas | Réglages `SMTP_*` dans `.env` (puis `docker compose up -d` pour les relire), enregistrements SPF/DKIM (étape 6), dossier spam. |
| Le disque se remplit | `df -h` ; `docker system df` ; `docker image prune -f`. |
| Après une modification de `.env` | `docker compose up -d` (les conteneurs concernés redémarrent avec les nouveaux réglages). |
| Je n'arrive plus à me connecter en SSH | Console de secours dans l'espace client OVH (« KVM ») : elle donne accès au serveur sans SSH. |

Commandes utiles :

```bash
$ docker compose logs -f backend        # suivre les journaux en direct (Ctrl+C pour arrêter)
$ docker compose restart backend        # redémarrer un service
$ docker compose exec db psql -U portfolio -d portfolio    # console de la base (\q pour quitter)
```
