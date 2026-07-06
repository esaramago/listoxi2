migrate((db) => {
  // Update all existing users to have emailVisibility = true (1 in SQLite)
  // so they can be searched by email when invited by other users
  db.newQuery("UPDATE users SET emailVisibility = 1 WHERE emailVisibility = 0 OR emailVisibility IS NULL").execute();

  // Create a trigger to automatically set emailVisibility = 1 for any newly created user
  db.newQuery(`
    CREATE TRIGGER IF NOT EXISTS set_email_visibility_default
    AFTER INSERT ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET emailVisibility = 1 WHERE id = NEW.id;
    END;
  `).execute();
}, (db) => {
  // Down migration: drop trigger and optionally revert emailVisibility to false (0)
  db.newQuery("DROP TRIGGER IF EXISTS set_email_visibility_default").execute();
  db.newQuery("UPDATE users SET emailVisibility = 0 WHERE emailVisibility = 1").execute();
});
