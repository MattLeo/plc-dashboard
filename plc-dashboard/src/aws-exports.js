const awsmobile = {
    "aws_project_region": "us-east-1",
    "aws_cognito_region": "us-east-1",
    "aws_user_pools_id": "us-east-1_2dFRYynrW",
    "aws_user_pools_web_client_id": "6o2q9qmaceke1lsabferusfkh3",
    "oauth": {
        "domain": "us-east-12dfryynrw.auth.us-east-1.amazoncognito.com",
        "scope": [
            "phone",
            "openid",
            "email"
        ],
        "redirectSignIn": "https://v0-5.d175kvisuax4ef.amplifyapp.com/",
        "redirectSignOut": "https://v0-5.d175kvisuax4ef.amplifyapp.com/",
        "responseType": "code"
    },
    "aws_cognito_username_attributes": [],
    "aws_cognito_social_providers": [],
    "aws_cognito_signup_attributes": [
        "PREFERRED_USERNAME",
        "ZONEINFO",
        "EMAIL"
    ],
    "aws_cognito_mfa_configuration": "OFF",
    "aws_cognito_mfa_types": [],
    "aws_cognito_password_protection_settings": {
        "passwordPolicyMinLength": 8,
        "passwordPolicyCharacters": [
            "REQUIRES_LOWERCASE",
            "REQUIRES_UPPERCASE",
            "REQUIRES_NUMBERS",
            "REQUIRES_SYMBOLS"
        ]
    },
    "aws_cognito_verification_mechanisms": [
        "EMAIL"
    ]
};


export default awsmobile;