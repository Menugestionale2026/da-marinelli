# Da Marinelli — menù digitale

Menù web della pizzeria **Da Marinelli** in italiano, inglese, tedesco e sloveno, con area gestionale per piatti, prezzi e prenotazioni.

## File

| File | A cosa serve |
| --- | --- |
| `index.html` | Menù pubblico per i clienti |
| `admin.html` | Area gestionale (PIN predefinito `1234`, da cambiare in Impostazioni) |
| `style.css` | Stile grafico, pensato prima di tutto per il telefono |
| `script.js` | Dati del menù, traduzioni e logica condivisa |
| `logo.jpg` | Stemma della pizzeria |

## Provarlo in locale

Apri `index.html` con un doppio clic (meglio Chrome o Edge), oppure dalla cartella del progetto:

```
python3 -m http.server 8000
```

e vai su `http://localhost:8000`.

## Come si aggiornano i dati

- `data.json` contiene menù, prezzi, orari e contatti **pubblicati**: il menù dei clienti (`index.html`) legge questo file.
- `admin.html` modifica i dati e riscrive `data.json` a ogni salvataggio, tramite l'API di GitHub. GitHub Pages lo ripubblica in uno o due minuti.
- **Accesso con password:** `admin-key.json` contiene un token GitHub (fine-grained, solo questo repository, permesso *Contents: Read and write*) cifrato con la password dei proprietari (PBKDF2-SHA256 600.000 giri + AES-GCM). Chi conosce la password entra da qualsiasi dispositivo; il browser decifra il token e lo usa. Senza password il file non serve a nulla.
- Attivazione (una volta sola): Impostazioni → Pubblicazione online → incolla il token e scegli la password (almeno 10 caratteri, non solo numeri). Se il token scade (massimo un anno), se ne crea uno nuovo e si incolla nello stesso punto.
- Se il repository viene spostato su un altro account, aggiorna `PUBLISH.repo` in `script.js` e rifai l'attivazione.
- La sicurezza dipende dalla forza della password: chi la indovinasse potrebbe modificare il repository. Usare una frase lunga.

## Limiti da conoscere

- Le prenotazioni online sono **spente** (`ONLINE_BOOKINGS = false` in `script.js`): al posto del modulo il menù mostra Chiama e WhatsApp. Le prenotazioni inserite a mano in `admin.html` restano nel browser e non vengono pubblicate.
- Il numero WhatsApp, se c'è, si imposta da Impostazioni.
- Ogni modifica pubblicata è un commit del repository.
