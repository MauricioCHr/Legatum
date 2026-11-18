<?php

return [
    'policy_version' => env('LEGATUM_PRIVACY_POLICY_VERSION', '1.0'),
    'effective_at' => env('LEGATUM_PRIVACY_POLICY_EFFECTIVE_AT') ?: null,
    'responsible_name' => env('LEGATUM_PRIVACY_RESPONSIBLE_NAME', ''),
    'responsible_identification' => env('LEGATUM_PRIVACY_RESPONSIBLE_IDENTIFICATION', ''),
    'contact_email' => env('LEGATUM_PRIVACY_CONTACT_EMAIL', ''),
    'contact_address' => env('LEGATUM_PRIVACY_CONTACT_ADDRESS', ''),
    'policy_text' => env(
        'LEGATUM_PRIVACY_POLICY_TEXT',
        implode("\n", [
            'BORRADOR PARA REVISIÓN JURÍDICA. La organización debe completar los datos del responsable y del canal de atención antes de adoptar esta política.',
            '',
            '1. Responsable del tratamiento',
            'El responsable y sus datos de identificación y contacto se muestran en los campos de responsable y contacto de esta página. Si aparecen pendientes de configurar, la organización debe completarlos antes de usar esta política.',
            '',
            '2. Datos tratados y finalidades',
            'LEGATUM permite administrar información de identificación, contacto y relación laboral, incluidos contratos, asistencia, permisos, evaluaciones y novedades de nómina. Los datos se usan para gestionar esos procesos y atender obligaciones laborales y legales aplicables.',
            '',
            '3. Datos sensibles y soportes',
            'Los soportes aportados para permisos pueden contener información médica o familiar sensible. Se deben solicitar solo cuando el tipo de permiso lo requiera, limitar su acceso al personal autorizado y conservarlos de forma segura conforme a las reglas de retención definidas por la organización.',
            '',
            '4. Derechos de las personas',
            'La persona titular puede solicitar conocer, actualizar o rectificar sus datos y ejercer los demás derechos que le reconozca la ley. Las solicitudes se deben presentar por el canal de contacto informado por el responsable.',
            '',
            '5. Conservación y seguridad',
            'Los datos se conservarán durante los plazos legales y los periodos documentados por la organización. El acceso debe limitarse según las funciones autorizadas y protegerse con medidas técnicas y organizativas apropiadas.',
            '',
            '6. Versionado y aceptación',
            'La aceptación queda asociada a esta versión y a una copia del texto mostrado, con fecha y hora de aceptación. La organización debe publicar una nueva versión cuando cambie el contenido material de la política.',
        ]),
    ),
];
