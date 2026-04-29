"""
RDX Tools — Facebook Token Generator microservice
Runs as a sidecar to the main Node/Express server.
Bound to 127.0.0.1 only — Express proxies public requests to it.
"""
import base64
import io
import os
import random
import string
import struct
import time
import uuid

import pyotp
import requests
from Crypto.Cipher import AES, PKCS1_v1_5
from Crypto.PublicKey import RSA
from Crypto.Random import get_random_bytes
from flask import Flask, jsonify, request

app = Flask(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 15; NX789J Build/AQ3A.240812.002) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.109 "
    "Mobile Safari/537.36"
)


class Facebook:
    def __init__(self, email, password, auth=None, machine_id=None):
        self.email = email
        self.password = self.enc_password(password)
        self.auth = auth.replace(" ", "") if auth else ""
        self.URL = "https://b-graph.facebook.com/auth/login"
        self.API_KEY = "882a8490361da98702bf97a021ddc14d"
        self.SIG = "214049b9f17c38bd767de53752b53946"
        self.device_id = str(uuid.uuid4())
        self.adid = str(uuid.uuid4())
        self.machine_id = machine_id or "".join(
            random.choices(string.ascii_letters + string.digits, k=24)
        )
        self.jazoest = "".join(random.choices(string.digits, k=5))
        self.HEADERS = {
            "content-type": "application/x-www-form-urlencoded",
            "x-fb-net-hni": "45201",
            "zero-rated": "0",
            "x-fb-sim-hni": "45201",
            "x-fb-connection-quality": "EXCELLENT",
            "x-fb-friendly-name": "authenticate",
            "x-fb-connection-bandwidth": "78032897",
            "x-tigon-is-retry": "False",
            "authorization": "OAuth null",
            "x-fb-connection-type": "WIFI",
            "x-fb-device-group": "3342",
            "priority": "u=3,i",
            "x-fb-http-engine": "Liger",
            "x-fb-client-ip": "True",
            "x-fb-server-cluster": "True",
            "user-agent": USER_AGENT,
        }

    def enc_password(self, password):
        try:
            url = "https://b-graph.facebook.com/pwd_key_fetch"
            params = {
                "version": "2",
                "flow": "CONTROLLER_INITIALIZATION",
                "method": "GET",
                "fb_api_req_friendly_name": "pwdKeyFetch",
                "fb_api_caller_class": "com.facebook.auth.login.AuthOperations",
                "access_token": "438142079694454|fc0a7caa49b192f64f6f5a6d9643bb28",
            }
            response = requests.post(url, params=params, timeout=30).json()
            public_key = response.get("public_key")
            key_id = str(response.get("key_id", "25"))

            rand_key = get_random_bytes(32)
            iv = get_random_bytes(12)
            pubkey = RSA.import_key(public_key)
            cipher_rsa = PKCS1_v1_5.new(pubkey)
            encrypted_rand_key = cipher_rsa.encrypt(rand_key)

            cipher_aes = AES.new(rand_key, AES.MODE_GCM, nonce=iv)
            current_time = int(time.time())
            cipher_aes.update(str(current_time).encode("utf-8"))
            encrypted_passwd, auth_tag = cipher_aes.encrypt_and_digest(
                password.encode("utf-8")
            )

            buf = io.BytesIO()
            buf.write(bytes([1, int(key_id)]))
            buf.write(iv)
            buf.write(struct.pack("<h", len(encrypted_rand_key)))
            buf.write(encrypted_rand_key)
            buf.write(auth_tag)
            buf.write(encrypted_passwd)
            encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
            return f"#PWD_FB4A:2:{current_time}:{encoded}"
        except Exception as e:
            raise Exception(f"Password encryption failed: {e}")

    def login(self, app_id, twofactor_code=None):
        data = {
            "email": self.email,
            "password": self.password,
            "generate_session_cookies": "1",
            "locale": "en_US",
            "client_country_code": "US",
            "access_token": app_id,
            "api_key": self.API_KEY,
            "adid": self.adid,
            "account_switcher_uids": f'["{self.email}"]',
            "source": "login",
            "machine_id": self.machine_id,
            "jazoest": self.jazoest,
            "meta_inf_fbmeta": "V2_UNTAGGED",
            "fb_api_req_friendly_name": "authenticate",
            "fb_api_caller_class": "Fb4aAuthHandler",
            "sig": self.SIG,
        }

        result = requests.post(
            self.URL, headers=self.HEADERS, data=data, timeout=45
        ).json()

        if "error" in result:
            error_data = result.get("error", {}).get("error_data", {})
            if "login_first_factor" in error_data and "uid" in error_data:
                if not self.auth and not twofactor_code:
                    return {
                        "status": "2fa_required",
                        "uid": error_data.get("uid"),
                        "first_factor": error_data.get("login_first_factor"),
                    }
                if not twofactor_code and self.auth:
                    twofactor_code = pyotp.TOTP(self.auth).now()

                data = {
                    "locale": "en_US",
                    "format": "json",
                    "email": self.email,
                    "device_id": self.device_id,
                    "access_token": app_id,
                    "generate_session_cookies": "true",
                    "generate_machine_id": "1",
                    "twofactor_code": twofactor_code,
                    "credentials_type": "two_factor",
                    "error_detail_type": "button_with_disabled",
                    "first_factor": error_data["login_first_factor"],
                    "password": self.password,
                    "userid": error_data["uid"],
                    "machine_id": self.machine_id,
                }
                result = requests.post(
                    self.URL, headers=self.HEADERS, data=data, timeout=45
                ).json()

        if "access_token" in result:
            access_token = result.get("access_token")
            cookies_string = "; ".join(
                f"{c['name']}={c['value']}"
                for c in result.get("session_cookies", [])
            )
            return {
                "status": "success",
                "token": access_token,
                "cookies": cookies_string,
            }
        return {
            "status": "error",
            "message": result.get("error", {}).get("message", "Unknown error"),
        }


def get_uid_from_cookie(cookies):
    import re

    match = re.search(r"c_user=(\d+)", cookies)
    return match.group(1) if match else None


@app.route("/health")
def health():
    return jsonify({"ok": True, "service": "rdx-token"})


@app.route("/generate-token", methods=["POST"])
def generate_token():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    auth = (data.get("auth") or "").strip()
    app_id = (data.get("app_id") or "").strip()
    twofactor_code = (data.get("twofactor_code") or "").strip()

    if not email or not password or not app_id:
        return jsonify(
            {"status": "error", "message": "Email, password aur app type chahiye"}
        )

    try:
        fb = Facebook(email, password, auth if auth else "")
        result = fb.login(app_id, twofactor_code if twofactor_code else None)

        if result["status"] == "success":
            uid = get_uid_from_cookie(result["cookies"])
            return jsonify(
                {
                    "status": "success",
                    "uid": uid,
                    "token": result["token"],
                    "cookies": result["cookies"],
                }
            )
        if result["status"] == "2fa_required":
            return jsonify(
                {
                    "status": "2fa_required",
                    "uid": result["uid"],
                    "message": "2FA verification required",
                }
            )
        return jsonify(
            {"status": "error", "message": result.get("message", "Login failed")}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@app.route("/generate-multiple", methods=["POST"])
def generate_multiple():
    data = request.get_json(silent=True) or {}
    accounts_text = (data.get("accounts") or "").strip()
    app_id = (data.get("app_id") or "").strip()

    if not accounts_text or not app_id:
        return jsonify(
            {"status": "error", "message": "Accounts list aur app type chahiye"}
        )

    results = []
    lines = [l.strip() for l in accounts_text.splitlines() if l.strip()]

    for line in lines:
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2:
            results.append(
                {"email": line, "status": "error", "message": "Invalid format"}
            )
            continue

        email = parts[0]
        password = parts[1]
        auth = parts[2] if len(parts) > 2 else ""

        try:
            fb = Facebook(email, password, auth)
            result = fb.login(app_id)
            if result["status"] == "success":
                uid = get_uid_from_cookie(result["cookies"])
                results.append(
                    {
                        "email": email,
                        "status": "success",
                        "uid": uid,
                        "token": result["token"],
                        "cookies": result["cookies"],
                    }
                )
            elif result["status"] == "2fa_required":
                results.append(
                    {
                        "email": email,
                        "status": "2fa_required",
                        "message": "2FA required",
                    }
                )
            else:
                results.append(
                    {
                        "email": email,
                        "status": "error",
                        "message": result.get("message", "Login failed"),
                    }
                )
        except Exception as e:
            results.append({"email": email, "status": "error", "message": str(e)})

    return jsonify({"status": "success", "results": results})


if __name__ == "__main__":
    port = int(os.environ.get("TOKEN_PORT", "5050"))
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
