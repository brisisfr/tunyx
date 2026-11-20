# tunyx

## Frontend

1. Start Apache and MySQL in XAMPP.
2. Import `db/(WAJIB PAKAI INI)skema.sql` in phpMyAdmin. This creates the `tunyx` database. There is no seed data: the app starts empty.
3. Open `http://localhost/tunyx/`.
4. Register an account (username 3-30 letters/numbers/`_`/`.`, password 6-64 printable ASCII with no spaces, valid email), then upload a song.
5. `http://localhost/tunyx/?mock=1` runs the offline demo (no PHP/MySQL needed).
6. The server accepts audio up to 100 MB. In `php.ini` set `upload_max_filesize=100M` and `post_max_size=110M`, then restart Apache.

