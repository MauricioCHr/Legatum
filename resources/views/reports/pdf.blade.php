<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportData['title'] }}</title>
    <style>
        @page {
            margin: 24mm 10mm 18mm;
        }

        body {
            color: #1e293b;
            font-family: DejaVu Sans, sans-serif;
            font-size: 8px;
        }

        header {
            border-bottom: 2px solid #0f172a;
            margin-bottom: 12px;
            padding-bottom: 9px;
        }

        .brand {
            color: #475569;
            font-size: 8px;
            font-weight: bold;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }

        h1 {
            color: #0f172a;
            font-size: 16px;
            margin: 6px 0 4px;
        }

        .meta {
            color: #64748b;
            font-size: 8px;
            line-height: 1.5;
        }

        .summary {
            border-collapse: separate;
            border-spacing: 5px;
            margin: 0 -5px 12px;
            width: 100%;
        }

        .summary td {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 7px;
            width: 25%;
        }

        .summary-label {
            color: #64748b;
            display: block;
            font-size: 7px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .summary-value {
            color: #0f172a;
            display: block;
            font-size: 11px;
            font-weight: bold;
            margin-top: 3px;
        }

        .charts {
            border-collapse: separate;
            border-spacing: 5px;
            margin: 0 -5px 12px;
            width: 100%;
        }

        .chart-card {
            border: 1px solid #e2e8f0;
            padding: 7px;
            vertical-align: top;
            width: 50%;
        }

        .chart-title,
        .section-title {
            color: #0f172a;
            font-size: 9px;
            font-weight: bold;
            margin: 0 0 6px;
        }

        .chart-row {
            border-collapse: collapse;
            font-size: 7px;
            margin-bottom: 4px;
            width: 100%;
        }

        .chart-label {
            color: #475569;
            padding-right: 5px;
            width: 28%;
        }

        .chart-track {
            background: #e2e8f0;
            height: 7px;
        }

        .chart-bar {
            background: #547da6;
            height: 7px;
        }

        .chart-value {
            color: #334155;
            font-weight: bold;
            padding-left: 5px;
            text-align: right;
            width: 12%;
        }

        .report-section {
            margin-top: 12px;
        }

        table.data {
            border-collapse: collapse;
            width: 100%;
        }

        .data thead {
            display: table-header-group;
        }

        .data th {
            background: #e2e8f0;
            color: #0f172a;
            font-size: 7px;
            font-weight: bold;
            text-align: left;
            text-transform: uppercase;
        }

        .data th,
        .data td {
            border: 1px solid #cbd5e1;
            padding: 5px 4px;
            vertical-align: top;
            word-wrap: break-word;
        }

        .data tr {
            page-break-inside: avoid;
        }

        .section-title {
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
        }

        .empty {
            border: 1px solid #cbd5e1;
            color: #64748b;
            padding: 14px;
            text-align: center;
        }

        footer {
            bottom: -11mm;
            color: #64748b;
            font-size: 7px;
            position: fixed;
            text-align: center;
            width: 100%;
        }

        .page-number:before {
            content: counter(page);
        }
    </style>
</head>
<body>
    <header>
        <div class="brand">LEGATUM · Gestión de Talento Humano</div>
        <h1>{{ $reportData['title'] }}</h1>
        <div class="meta">
            Generado por {{ $generatedBy }} · {{ $generatedAt->format('d/m/Y H:i') }}
            @if ($filters['department_id'] !== '')
                · Departamento: {{ $departmentName ?? 'Departamento ' . $filters['department_id'] }}
            @endif
            @if ($filters['employee_id'] !== '')
                · Colaborador ID: {{ $filters['employee_id'] }}
            @endif
            @if (! empty($reportData['period']))
                · Período: {{ $reportData['period'] }}
            @endif
            @if (in_array($reportType, ['attendance_general', 'attendance_by_employee', 'absenteeism'], true))
                · Periodo: {{ $filters['date_from'] }} a {{ $filters['date_to'] }}
            @endif
        </div>
    </header>

    @if (count($reportData['summary']) > 0)
        <table class="summary">
            <tr>
                @foreach ($reportData['summary'] as $label => $value)
                    @if ($loop->index > 0 && $loop->index % 4 === 0)
                        </tr><tr>
                    @endif
                    <td>
                        <span class="summary-label">{{ $label }}</span>
                        <span class="summary-value">{{ $value }}</span>
                    </td>
                @endforeach
            </tr>
        </table>
    @endif

    @if (! empty($reportData['charts']))
        <table class="charts">
            @foreach (array_chunk($reportData['charts'], 2) as $chartRow)
                <tr>
                    @foreach ($chartRow as $chart)
                        <td class="chart-card">
                            <div class="chart-title">{{ $chart['title'] }}</div>
                            @forelse ($chart['points'] as $point)
                                <table class="chart-row">
                                    <tr>
                                        <td class="chart-label">{{ $point['label'] }}</td>
                                        <td>
                                            <div class="chart-track">
                                                <div
                                                    class="chart-bar"
                                                    style="width: {{ min(max((float) $point['percentage'], 0), 100) }}%;"
                                                ></div>
                                            </div>
                                        </td>
                                        <td class="chart-value">{{ $point['value'] }}</td>
                                    </tr>
                                </table>
                            @empty
                                <div class="meta">Sin datos para representar.</div>
                            @endforelse
                        </td>
                    @endforeach
                    @if (count($chartRow) === 1)
                        <td class="chart-card"></td>
                    @endif
                </tr>
            @endforeach
        </table>
    @endif

    @if (count($reportData['rows']) > 0)
        <table class="data">
            <thead>
                <tr>
                    @foreach ($reportData['headers'] as $header)
                        <th>{{ $header }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach ($reportData['rows'] as $row)
                    <tr>
                        @foreach ($row as $value)
                            <td>{{ $value }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="empty">No se encontraron registros para los filtros seleccionados.</div>
    @endif

    @foreach ($reportData['sections'] ?? [] as $section)
        <section class="report-section">
            <h2 class="section-title">{{ $section['title'] }}</h2>
            @if (count($section['rows']) > 0)
                <table class="data">
                    <thead>
                        <tr>
                            @foreach ($section['headers'] as $header)
                                <th>{{ $header }}</th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($section['rows'] as $row)
                            <tr>
                                @foreach ($row as $value)
                                    <td>{{ $value }}</td>
                                @endforeach
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <div class="empty">No se encontraron registros para este período.</div>
            @endif
            @if (isset($section['change_percentage_points']) && $section['change_percentage_points'] !== null)
                <div class="meta">
                    Variación de asistencia:
                    {{ $section['change_percentage_points'] > 0 ? '+' : '' }}{{ $section['change_percentage_points'] }}
                    puntos porcentuales.
                </div>
            @endif
        </section>
    @endforeach

    <footer>
        LEGATUM · Reporte institucional · Página <span class="page-number"></span>
    </footer>
</body>
</html>
