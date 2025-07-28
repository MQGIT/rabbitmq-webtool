from cryptography.fernet import Fernet
import os
import base64


class EncryptionService:
    def __init__(self):
        # Get encryption key from environment or generate one
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            # Generate a new key for development
            key = Fernet.generate_key().decode()
            print(f"Generated new encryption key: {key}")
            print("Set ENCRYPTION_KEY environment variable for production!")
        
        if isinstance(key, str):
            key = key.encode()

        # Try to create Fernet with the key, if invalid, derive a proper key
        try:
            self.fernet = Fernet(key)
        except ValueError:
            # Generate a proper Fernet key from the provided key using SHA256
            import hashlib
            derived_key = hashlib.sha256(key).digest()
            fernet_key = base64.urlsafe_b64encode(derived_key)
            self.fernet = Fernet(fernet_key)
            print(f"Derived Fernet key from provided key")
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64 encoded result"""
        encrypted = self.fernet.encrypt(data.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64 encoded encrypted data"""
        try:
            encrypted_bytes = base64.b64decode(encrypted_data.encode())
            decrypted = self.fernet.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt data: {str(e)}")


# Global encryption service instance
encryption_service = EncryptionService()
