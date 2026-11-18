<?php

namespace App;

enum AttendanceMarkStatus
{
    case EntryRecorded;
    case ExitRecorded;
    case AlreadyRecorded;
    case NoOpenEntry;
    case InvalidCredentials;
    case InactiveEmployee;
    case PrivacyAcceptanceRequired;
}
