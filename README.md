# 🌳 BaumDesTages — v0.1 (Entwicklungsstand)

Eine kostenlose, weltweite Baum-Community: Baumkarte, Baumprofile, Fotos, Likes, Kommentare, Benutzerkonten.

**Status: isoliertes Supabase-Backend eingerichtet, Entwicklungsbranch. Nicht öffentlich veröffentlicht.**

## Demo lokal ansehen

1. Dieses Repository herunterladen.
2. Mit `python3 -m http.server 8080` im Repositoryverzeichnis starten.
3. `http://localhost:8080` öffnen. Da das Backend verbunden ist, werden anfangs noch keine Baumbeiträge angezeigt.

Keine npm-Installation nötig. Die Kartenbibliothek wird per jsDelivr und bei aktiver Backend-Konfiguration die Supabase-Bibliothek per esm.sh geladen. Internetverbindung nötig.

## Backend (eingerichtet am 25.10.2026)

**Separates Supabase-Projekt verwenden. Niemals die Datenbank von MyGardenAtlas benutzen.**

1. Eigenes EU-Supabase-Projekt anlegen; vorher mögliche Projektgebühren prüfen.
2. `supabase/schema.sql` **ausschließlich in diesem neuen Projekt** ausführen.
3. E-Mail-Anmeldung und Bestätigungs-Mails in Supabase Auth konfigurieren.
4. In `config.js` ausschließlich Projekt-URL und **publishable API key** eintragen.
5. Keine geheimen Backend-/service_role-Keys in öffentliche Dateien schreiben!
6. Nach Einrichtung mit zwei echten Testkonten testen (Profile, Beiträge, Bilder und RLS).

## Bestehende Funktionen

- Öffentliche Entdeckungsansicht, Baumsteckbriefe und Suche
- Weltkarte mit anklickbaren Baum-Markern (Leaflet)
- Registrierung und Login, Benutzername / Anzeigename / Biografie
- Baumbeitrag mit optional bis zu fünf Fotos (Browser-Komprimierung auf JPEG)
- GPS-Übernahme auf Knopfdruck, ungefähre oder exakte Koordinaten
- Likes und Kommentare, Eigentümer-Schutz per Row-Level Security
- Mobile-first Layout und Demo-Modus bei auskommentierter Backend-Konfiguration
- Private Trennung der App von MyGardenAtlas

## Betriebskosten und Sicherheit

In v0.1 dient Supabase Storage als *einfacher Prototyp-Speicher*. Die kostengünstige R2-Medienpipeline ist für die nächste Ausbaustufe vorgesehen. Vor einem öffentlichen Start erforderlich:

- Cloudflare R2/Images-Anbindung, sicherer Upload-Dienst, Quoten und Bot-Abwehr
- serverseitig atomare Upload-Limits / Rate-Limits (SQL-Zählung allein reicht nicht)
- Inhaltmoderation, Meldefunktion, Admin-Ansicht, Sperr- und Löschfunktionen
- DSGVO-konformes Impressum, Datenschutz, Export und Konto-/Medienlöschung
- lizenzierter Tile-Dienst statt OSM-Communitytiles bei größerem Traffic
- Geografische Datenabfrage für große Datensätze mit Bounding-Box und Clusterung
- Vollständige Tests von Row-Level Security, Auth und Foto-Downloads mit Testkonten
- Error-Monitoring, Backups und Kostenwarnungen

**Wichtig:** Das Repository ist derzeit öffentlich. Keine Zugangsdaten, privaten Fotos oder realen Nutzerinformationen committen.

## Technisches Konzept

Statische Web-App (HTML/CSS/ES Modules); Leaflet/OSM in Entwicklung; Supabase Auth, Postgres mit RLS und Storage nach Konfiguration. Kein Build oder GitHub-Work-Kontingent erforderlich.

Dies ist eine funktionsorientierte erste Ausbaustufe, **noch keine freigabereife globale Plattform**.
