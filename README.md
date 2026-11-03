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
- `admin.html` modifica i dati e, se è collegata con un token GitHub (Impostazioni → Pubblicazione online), riscrive `data.json` a ogni salvataggio. GitHub Pages lo ripubblica in uno o due minuti.
- Il token (fine-grained, solo repository `da-marinelli`, permesso *Contents: Read and write*) resta nel browser del titolare. Senza token le modifiche restano solo in quel browser.
- Il PIN dell'area gestionale non protegge davvero i dati: la chiave è il token.

## Limiti da conoscere

- Le prenotazioni online sono **spente** (`ONLINE_BOOKINGS = false` in `script.js`): al posto del modulo il menù mostra Chiama e WhatsApp. Le prenotazioni inserite a mano in `admin.html` restano nel browser e non vengono pubblicate.
- Il numero WhatsApp, se c'è, si imposta da Impostazioni.
- Ogni modifica pubblicata è un commit del repository.
