const crypto = require('crypto');

// Derive a 32-byte key using scrypt from a base secret and a per-user salt
function deriveKey(baseSecret, userSalt) {
    const salt = Buffer.isBuffer(userSalt) ? userSalt : Buffer.from(String(userSalt));
    return crypto.scryptSync(baseSecret, salt, 32);
}

// Encrypt text with AES-256-GCM. Returns base64(iv|ciphertext|tag)
function encryptWithKey(plainText, key, associatedData) {
    if (plainText == null) return null;
    const iv = crypto.randomBytes(12); // GCM nonce
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    if (associatedData) cipher.setAAD(Buffer.from(String(associatedData)));
    const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

// Decrypt base64(iv|tag|ciphertext)
function decryptWithKey(encoded, key, associatedData) {
    if (encoded == null) return null;
    try {
        const buf = Buffer.from(String(encoded), 'base64');
        const iv = buf.subarray(0, 12);
        const tag = buf.subarray(12, 28);
        const ciphertext = buf.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        if (associatedData) decipher.setAAD(Buffer.from(String(associatedData)));
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plain.toString('utf8');
    } catch (e) {
        return null;
    }
}

function getUserVaultKey(userId) {
    const base = process.env.VAULT_ENCRYPTION_KEY;
    if (!base || base.length < 16) throw new Error('VAULT_ENCRYPTION_KEY not set or too weak');
    return deriveKey(base, userId);
}

module.exports = {
    deriveKey,
    encryptWithKey,
    decryptWithKey,
    getUserVaultKey,
};


