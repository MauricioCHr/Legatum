<?php

return [
    'admin_name' => env('LEGATUM_ADMIN_NAME'),
    'admin_email' => env('LEGATUM_ADMIN_EMAIL'),
    'admin_password' => env('LEGATUM_ADMIN_PASSWORD'),
    'contract_expiry_days' => (int) env('LEGATUM_CONTRACT_EXPIRY_DAYS', 30),
    'contract_expiry_urgent_days' => (int) env('LEGATUM_CONTRACT_EXPIRY_URGENT_DAYS', 10),
];
