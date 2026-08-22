import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// bcrypt.compare() can throw an error if the hash is invalid, so we catch it and return false in that case
export async function verifyPassword(
    hash: string,
    plainPassword: string,
): Promise<boolean> {
    try {
        return await bcrypt.compare(plainPassword, hash);
    } catch {
        return false;
    }
}
 // Hashiranje lozinke sa bcryptom, koristi se u registration endpointu i prilikom promjene lozinke
export async function hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}