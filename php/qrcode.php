<?php
/**
 * Minimal QR Code PNG generator using GD.
 * Supports byte mode, versions 1-6, error correction level L.
 * No external dependencies.
 */

function generate_qr_png(string $data, int $size = 300): string {
    $modules = _qr_encode($data);
    $n = count($modules);
    $scale = max(1, intdiv($size, $n + 8));
    $imgSize = ($n + 8) * $scale;

    $img = imagecreatetruecolor($imgSize, $imgSize);
    $white = imagecolorallocate($img, 255, 255, 255);
    $black = imagecolorallocate($img, 30, 57, 50); // brand color #1e3932 (House Green)
    imagefill($img, 0, 0, $white);

    $offset = 4 * $scale;
    for ($y = 0; $y < $n; $y++) {
        for ($x = 0; $x < $n; $x++) {
            if ($modules[$y][$x]) {
                imagefilledrectangle($img,
                    $offset + $x * $scale, $offset + $y * $scale,
                    $offset + ($x + 1) * $scale - 1, $offset + ($y + 1) * $scale - 1,
                    $black
                );
            }
        }
    }

    ob_start();
    imagepng($img);
    $png = ob_get_clean();
    imagedestroy($img);
    return $png;
}

function _qr_encode(string $data): array {
    $dataLen = strlen($data);
    // Version capacity for byte mode, EC level L
    $versions = [
        1 => ['total' => 26,  'ec' => 7,  'data' => 19,  'blocks' => 1],
        2 => ['total' => 44,  'ec' => 10, 'data' => 34,  'blocks' => 1],
        3 => ['total' => 70,  'ec' => 15, 'data' => 55,  'blocks' => 1],
        4 => ['total' => 100, 'ec' => 20, 'data' => 80,  'blocks' => 1],
        5 => ['total' => 134, 'ec' => 26, 'data' => 108, 'blocks' => 1],
        6 => ['total' => 172, 'ec' => 18, 'data' => 136, 'blocks' => 2],
    ];

    $version = 0;
    foreach ($versions as $v => $info) {
        if ($dataLen <= $info['data'] - 3) { $version = $v; break; }
    }
    if ($version === 0) $version = 6;

    $vi = $versions[$version];
    $n = 17 + $version * 4; // module count

    // Encode data: mode(4) + count(8/16) + data + terminator + padding
    $bits = '';
    $bits .= '0100'; // byte mode
    $countBits = $version <= 9 ? 8 : 16;
    $bits .= str_pad(decbin($dataLen), $countBits, '0', STR_PAD_LEFT);
    for ($i = 0; $i < $dataLen; $i++) {
        $bits .= str_pad(decbin(ord($data[$i])), 8, '0', STR_PAD_LEFT);
    }
    $bits .= '0000'; // terminator

    // Pad to byte boundary
    while (strlen($bits) % 8 !== 0) $bits .= '0';

    // Pad to data capacity
    $dataBytes = $vi['data'];
    $padPatterns = ['11101100', '00010001'];
    $pi = 0;
    while (strlen($bits) < $dataBytes * 8) {
        $bits .= $padPatterns[$pi % 2];
        $pi++;
    }

    // Convert to byte array
    $codewords = [];
    for ($i = 0; $i < strlen($bits); $i += 8) {
        $codewords[] = intval(substr($bits, $i, 8), 2);
    }

    // Generate EC codewords using RS
    $ecCount = $vi['ec'];
    if ($vi['blocks'] === 1) {
        $ecWords = _rs_encode($codewords, $ecCount);
        $finalData = array_merge($codewords, $ecWords);
    } else {
        $blockSize = intdiv(count($codewords), $vi['blocks']);
        $blocks = array_chunk($codewords, $blockSize);
        $ecBlocks = [];
        foreach ($blocks as $block) {
            $ecBlocks[] = _rs_encode($block, $ecCount);
        }
        $finalData = [];
        $maxLen = max(array_map('count', $blocks));
        for ($i = 0; $i < $maxLen; $i++) {
            foreach ($blocks as $block) {
                if (isset($block[$i])) $finalData[] = $block[$i];
            }
        }
        for ($i = 0; $i < $ecCount; $i++) {
            foreach ($ecBlocks as $ec) {
                if (isset($ec[$i])) $finalData[] = $ec[$i];
            }
        }
    }

    // Initialize matrix
    $modules = array_fill(0, $n, array_fill(0, $n, null));
    $reserved = array_fill(0, $n, array_fill(0, $n, false));

    // Place finder patterns
    _place_finder($modules, $reserved, $n, 0, 0);
    _place_finder($modules, $reserved, $n, $n - 7, 0);
    _place_finder($modules, $reserved, $n, 0, $n - 7);

    // Timing patterns
    for ($i = 8; $i < $n - 8; $i++) {
        $modules[6][$i] = $i % 2 === 0;
        $reserved[6][$i] = true;
        $modules[$i][6] = $i % 2 === 0;
        $reserved[$i][6] = true;
    }

    // Alignment pattern (version 2+)
    if ($version >= 2) {
        $alignPos = [6, $n - 7];
        foreach ($alignPos as $ay) {
            foreach ($alignPos as $ax) {
                if ($reserved[$ay][$ax]) continue;
                _place_alignment($modules, $reserved, $n, $ay, $ax);
            }
        }
    }

    // Dark module
    $modules[$n - 8][8] = true;
    $reserved[$n - 8][8] = true;

    // Reserve format info areas
    for ($i = 0; $i < 8; $i++) {
        if (!$reserved[8][$i]) { $reserved[8][$i] = true; $modules[8][$i] = false; }
        if (!$reserved[$i][8]) { $reserved[$i][8] = true; $modules[$i][8] = false; }
        if ($i < 7 && !$reserved[8][$n - 1 - $i]) { $reserved[8][$n - 1 - $i] = true; $modules[8][$n - 1 - $i] = false; }
        if ($i < 7 && !$reserved[$n - 1 - $i][8]) { $reserved[$n - 1 - $i][8] = true; $modules[$n - 1 - $i][8] = false; }
    }
    $reserved[8][8] = true;

    // Place data bits
    $dataBits = '';
    foreach ($finalData as $byte) {
        $dataBits .= str_pad(decbin($byte), 8, '0', STR_PAD_LEFT);
    }

    $bitIdx = 0;
    $x = $n - 1;
    $upward = true;
    while ($x >= 0) {
        if ($x === 6) { $x--; continue; }
        $col1 = $x;
        $col2 = $x - 1;
        $rows = $upward ? range($n - 1, 0, -1) : range(0, $n - 1);
        foreach ($rows as $y) {
            foreach ([$col1, $col2] as $cx) {
                if ($cx < 0 || $reserved[$y][$cx]) continue;
                $modules[$y][$cx] = $bitIdx < strlen($dataBits) && $dataBits[$bitIdx] === '1';
                $bitIdx++;
            }
        }
        $x -= 2;
        $upward = !$upward;
    }

    // Apply mask 0: (y + x) % 2 === 0
    for ($y = 0; $y < $n; $y++) {
        for ($x = 0; $x < $n; $x++) {
            if (!$reserved[$y][$x]) {
                if (($y + $x) % 2 === 0) {
                    $modules[$y][$x] = !$modules[$y][$x];
                }
            }
        }
    }

    // Write format info (EC level L = 01, mask 0 = 000 → format bits = 01000)
    $formatBits = '111011111000100';
    _write_format($modules, $n, $formatBits);

    return $modules;
}

function _place_finder(array &$m, array &$r, int $n, int $row, int $col): void {
    for ($dy = -1; $dy <= 7; $dy++) {
        for ($dx = -1; $dx <= 7; $dx++) {
            $y = $row + $dy; $x = $col + $dx;
            if ($y < 0 || $y >= $n || $x < 0 || $x >= $n) continue;
            $r[$y][$x] = true;
            if ($dy === -1 || $dy === 7 || $dx === -1 || $dx === 7) {
                $m[$y][$x] = false; // separator
            } elseif ($dy === 0 || $dy === 6 || $dx === 0 || $dx === 6 ||
                      ($dy >= 2 && $dy <= 4 && $dx >= 2 && $dx <= 4)) {
                $m[$y][$x] = true;
            } else {
                $m[$y][$x] = false;
            }
        }
    }
}

function _place_alignment(array &$m, array &$r, int $n, int $cy, int $cx): void {
    for ($dy = -2; $dy <= 2; $dy++) {
        for ($dx = -2; $dx <= 2; $dx++) {
            $y = $cy + $dy; $x = $cx + $dx;
            if ($y < 0 || $y >= $n || $x < 0 || $x >= $n) continue;
            $r[$y][$x] = true;
            $m[$y][$x] = (abs($dy) === 2 || abs($dx) === 2 || ($dy === 0 && $dx === 0));
        }
    }
}

function _write_format(array &$m, int $n, string $bits): void {
    $positions1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
    $positions2 = [[$n-1,8],[$n-2,8],[$n-3,8],[$n-4,8],[$n-5,8],[$n-6,8],[$n-7,8],[8,$n-8],[8,$n-7],[8,$n-6],[8,$n-5],[8,$n-4],[8,$n-3],[8,$n-2],[8,$n-1]];
    for ($i = 0; $i < 15; $i++) {
        $v = $bits[$i] === '1';
        [$y1, $x1] = $positions1[$i]; $m[$y1][$x1] = $v;
        [$y2, $x2] = $positions2[$i]; $m[$y2][$x2] = $v;
    }
}

function _rs_encode(array $data, int $ecCount): array {
    // GF(2^8) with polynomial 0x11d
    $gfExp = array_fill(0, 512, 0);
    $gfLog = array_fill(0, 256, 0);
    $v = 1;
    for ($i = 0; $i < 255; $i++) {
        $gfExp[$i] = $v;
        $gfLog[$v] = $i;
        $v <<= 1;
        if ($v >= 256) $v ^= 0x11d;
    }
    for ($i = 255; $i < 512; $i++) $gfExp[$i] = $gfExp[$i - 255];

    $gfMul = function(int $a, int $b) use (&$gfExp, &$gfLog): int {
        if ($a === 0 || $b === 0) return 0;
        return $gfExp[$gfLog[$a] + $gfLog[$b]];
    };

    // Generator polynomial
    $gen = [1];
    for ($i = 0; $i < $ecCount; $i++) {
        $newGen = array_fill(0, count($gen) + 1, 0);
        for ($j = 0; $j < count($gen); $j++) {
            $newGen[$j] ^= $gen[$j];
            $newGen[$j + 1] ^= $gfMul($gen[$j], $gfExp[$i]);
        }
        $gen = $newGen;
    }

    // Polynomial division
    $result = array_merge($data, array_fill(0, $ecCount, 0));
    for ($i = 0; $i < count($data); $i++) {
        $coef = $result[$i];
        if ($coef === 0) continue;
        for ($j = 1; $j < count($gen); $j++) {
            $result[$i + $j] ^= $gfMul($gen[$j], $coef);
        }
    }

    return array_slice($result, count($data));
}
