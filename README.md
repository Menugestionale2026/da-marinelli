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

## Limiti da conoscere

- Menù, prenotazioni e impostazioni sono salvati nel `localStorage` del browser: le modifiche fatte da `admin.html` **non** arrivano ai telefoni dei clienti e le prenotazioni dei clienti **non** arrivano al titolare. Per l'uso reale serve un database online.
- Le prenotazioni online sono **spente** (`ONLINE_BOOKINGS = false` in `script.js`): al posto del modulo il menù mostra i pulsanti Chiama e WhatsApp. Da riaccendere solo dopo aver collegato un database online. Dall'area gestionale si possono comunque inserire a mano le prenotazioni telefoniche.
- Telefono, indirizzo e orari in `script.js` (`DEFAULT_SETTINGS`) sono ancora segnaposto.
- Il PIN è controllato nel browser: tiene lontani i curiosi, non è una vera protezione.
