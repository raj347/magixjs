var libhusl;

(function() {
    var L_to_Y, Y_to_L, conv, distanceFromPole, dotProduct, epsilon, fromLinear, getBounds, intersectLineLine, kappa, lengthOfRayUntilIntersect, m, m_inv, maxChromaForLH, maxSafeChromaForL, refU, refV, root, toLinear;

    m = {
        R: [3.2409699419045214, - 1.5373831775700935, - 0.49861076029300328],
        G: [ - 0.96924363628087983, 1.8759675015077207, 0.041555057407175613],
        B: [0.055630079696993609, - 0.20397695888897657, 1.0569715142428786]
    };

    m_inv = {
        X: [0.41239079926595948, 0.35758433938387796, 0.18048078840183429],
        Y: [0.21263900587151036, 0.71516867876775593, 0.072192315360733715],
        Z: [0.019330818715591851, 0.11919477979462599, 0.95053215224966058]
    };

    refU = 0.19783000664283681;

    refV = 0.468319994938791;

    kappa = 903.2962962962963;

    epsilon = 0.0088564516790356308;

    getBounds = function(L) {
        var bottom, channel, j, k, len1, len2, m1, m2, m3, ref, ref1, ref2, ret, sub1, sub2, t, top1, top2;
        sub1 = Math.pow(L + 16, 3) / 1560896;
        sub2 = sub1 > epsilon ? sub1 : L / kappa;
        ret = [];
        ref = ['R', 'G', 'B'];
        for (j = 0, len1 = ref.length; j < len1; j++) {
            channel = ref[j];
            ref1 = m[channel], m1 = ref1[0], m2 = ref1[1], m3 = ref1[2];
            ref2 = [0, 1];
            for (k = 0, len2 = ref2.length; k < len2; k++) {
                t = ref2[k];
                top1 = (284517 * m1 - 94839 * m3) * sub2;
                top2 = (838422 * m3 + 769860 * m2 + 731718 * m1) * L * sub2 - 769860 * t * L;
                bottom = (632260 * m3 - 126452 * m2) * sub2 + 126452 * t;
                ret.push([top1 / bottom, top2 / bottom]);
            }
        }
        return ret;
    };

    intersectLineLine = function(line1, line2) {
        return (line1[1] - line2[1]) / (line2[0] - line1[0]);
    };

    distanceFromPole = function(point) {
        return Math.sqrt(Math.pow(point[0], 2) + Math.pow(point[1], 2));
    };

    lengthOfRayUntilIntersect = function(theta, line) {
        var b1, len, m1;
        m1 = line[0], b1 = line[1];
        len = b1 / (Math.sin(theta) - m1 * Math.cos(theta));
        if (len < 0) {
            return null;
        }
        return len;
    };

    maxSafeChromaForL = function(L) {
        var b1, j, len1, lengths, m1, ref, ref1, x;
        lengths = [];
        ref = getBounds(L);
        for (j = 0, len1 = ref.length; j < len1; j++) {
            ref1 = ref[j], m1 = ref1[0], b1 = ref1[1];
            x = intersectLineLine([m1, b1], [ - 1 / m1, 0]);
            lengths.push(distanceFromPole([x, b1 + x * m1]));
        }
        return Math.min.apply(Math, lengths);
    };

    maxChromaForLH = function(L, H) {
        var hrad, j, l, len1, lengths, line, ref;
        hrad = H / 360 * Math.PI * 2;
        lengths = [];
        ref = getBounds(L);
        for (j = 0, len1 = ref.length; j < len1; j++) {
            line = ref[j];
            l = lengthOfRayUntilIntersect(hrad, line);
            if (l !== null) {
                lengths.push(l);
            }
        }
        return Math.min.apply(Math, lengths);
    };

    dotProduct = function(a, b) {
        var i, j, ref, ret;
        ret = 0;
        for (i = j = 0, ref = a.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            ret += a[i] * b[i];
        }
        return ret;
    };

    fromLinear = function(c) {
        if (c <= 0.0031308) {
            return 12.92 * c;
        } else {
            return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        }
    };

    toLinear = function(c) {
        var a;
        a = 0.055;
        if (c > 0.04045) {
            return Math.pow((c + a) / (1 + a), 2.4);
        } else {
            return c / 12.92;
        }
    };

    conv = {
        'xyz': {},
        'luv': {},
        'lch': {},
        'husl': {},
        'huslp': {},
        'rgb': {},
        'hex': {}
    };

    conv.xyz.rgb = function(tuple) {
        var B, G, R;
        R = fromLinear(dotProduct(m.R, tuple));
        G = fromLinear(dotProduct(m.G, tuple));
        B = fromLinear(dotProduct(m.B, tuple));
        return [R, G, B];
    };

    conv.rgb.xyz = function(tuple) {
        var B, G, R, X, Y, Z, rgbl;
        R = tuple[0], G = tuple[1], B = tuple[2];
        rgbl = [toLinear(R), toLinear(G), toLinear(B)];
        X = dotProduct(m_inv.X, rgbl);
        Y = dotProduct(m_inv.Y, rgbl);
        Z = dotProduct(m_inv.Z, rgbl);
        return [X, Y, Z];
    };

    Y_to_L = function(Y) {
        if (Y <= epsilon) {
            return Y * kappa;
        } else {
            return 116 * Math.pow(Y, 1 / 3) - 16;
        }
    };

    L_to_Y = function(L) {
        if (L <= 8) {
            return L / kappa;
        } else {
            return Math.pow((L + 16) / 116, 3);
        }
    };

    conv.xyz.luv = function(tuple) {
        var L, U, V, X, Y, Z, varU, varV;
        X = tuple[0], Y = tuple[1], Z = tuple[2];
        if (Y === 0) {
            return [0, 0, 0];
        }
        L = Y_to_L(Y);
        varU = (4 * X) / (X + (15 * Y) + (3 * Z));
        varV = (9 * Y) / (X + (15 * Y) + (3 * Z));
        U = 13 * L * (varU - refU);
        V = 13 * L * (varV - refV);
        return [L, U, V];
    };

    conv.luv.xyz = function(tuple) {
        var L, U, V, X, Y, Z, varU, varV;
        L = tuple[0], U = tuple[1], V = tuple[2];
        if (L === 0) {
            return [0, 0, 0];
        }
        varU = U / (13 * L) + refU;
        varV = V / (13 * L) + refV;
        Y = L_to_Y(L);
        X = 0 - (9 * Y * varU) / ((varU - 4) * varV - varU * varV);
        Z = (9 * Y - (15 * varV * Y) - (varV * X)) / (3 * varV);
        return [X, Y, Z];
    };

    conv.luv.lch = function(tuple) {
        var C, H, Hrad, L, U, V;
        L = tuple[0], U = tuple[1], V = tuple[2];
        C = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
        if (C < 0.00000001) {
            H = 0;
        } else {
            Hrad = Math.atan2(V, U);
            H = Hrad * 360 / 2 / Math.PI;
            if (H < 0) {
                H = 360 + H;
            }
        }
        return [L, C, H];
    };

    conv.lch.luv = function(tuple) {
        var C, H, Hrad, L, U, V;
        L = tuple[0], C = tuple[1], H = tuple[2];
        Hrad = H / 360 * 2 * Math.PI;
        U = Math.cos(Hrad) * C;
        V = Math.sin(Hrad) * C;
        return [L, U, V];
    };

    conv.husl.lch = function(tuple) {
        var C, H, L, S, max;
        H = tuple[0], S = tuple[1], L = tuple[2];
        if (L > 99.9999999 || L < 0.00000001) {
            C = 0;
        } else {
            max = maxChromaForLH(L, H);
            C = max / 100 * S;
        }
        return [L, C, H];
    };

    conv.lch.husl = function(tuple) {
        var C, H, L, S, max;
        L = tuple[0], C = tuple[1], H = tuple[2];
        if (L > 99.9999999 || L < 0.00000001) {
            S = 0;
        } else {
            max = maxChromaForLH(L, H);
            S = C / max * 100;
        }
        return [H, S, L];
    };

    conv.huslp.lch = function(tuple) {
        var C, H, L, S, max;
        H = tuple[0], S = tuple[1], L = tuple[2];
        if (L > 99.9999999 || L < 0.00000001) {
            C = 0;
        } else {
            max = maxSafeChromaForL(L);
            C = max / 100 * S;
        }
        return [L, C, H];
    };

    conv.lch.huslp = function(tuple) {
        var C, H, L, S, max;
        L = tuple[0], C = tuple[1], H = tuple[2];
        if (L > 99.9999999 || L < 0.00000001) {
            S = 0;
        } else {
            max = maxSafeChromaForL(L);
            S = C / max * 100;
        }
        return [H, S, L];
    };

    conv.rgb.hex = function(tuple) {
        var ch, hex, j, len1;
        hex = "#";
        for (j = 0, len1 = tuple.length; j < len1; j++) {
            ch = tuple[j];
            ch = Math.round(ch * 1e6) / 1e6;
            if (ch < 0 || ch > 1) {
                throw new Error("Illegal rgb value: " + ch);
            }
            ch = Math.round(ch * 255).toString(16);
            if (ch.length === 1) {
                ch = "0" + ch;
            }
            hex += ch;
        }
        return hex;
    };

    conv.hex.rgb = function(hex) {
        var b, g, j, len1, n, r, ref, results;
        if (hex.charAt(0) === "#") {
            hex = hex.substring(1, 7);
        }
        r = hex.substring(0, 2);
        g = hex.substring(2, 4);
        b = hex.substring(4, 6);
        ref = [r, g, b];
        results = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
            n = ref[j];
            results.push(parseInt(n, 16) / 255);
        }
        return results;
    };

    conv.lch.rgb = function(tuple) {
        return conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(tuple)));
    };

    conv.rgb.lch = function(tuple) {
        return conv.luv.lch(conv.xyz.luv(conv.rgb.xyz(tuple)));
    };

    conv.husl.rgb = function(tuple) {
        return conv.lch.rgb(conv.husl.lch(tuple));
    };

    conv.rgb.husl = function(tuple) {
        return conv.lch.husl(conv.rgb.lch(tuple));
    };

    conv.huslp.rgb = function(tuple) {
        return conv.lch.rgb(conv.huslp.lch(tuple));
    };

    conv.rgb.huslp = function(tuple) {
        return conv.lch.huslp(conv.rgb.lch(tuple));
    };

    root = {};

    root.fromRGB = function(R, G, B) {
        return conv.rgb.husl([R, G, B]);
    };

    root.fromHex = function(hex) {
        return conv.rgb.husl(conv.hex.rgb(hex));
    };

    root.toRGB = function(H, S, L) {
        return conv.husl.rgb([H, S, L]);
    };

    root.toHex = function(H, S, L) {
        return conv.rgb.hex(conv.husl.rgb([H, S, L]));
    };

    root.p = {};

    root.p.toRGB = function(H, S, L) {
        return conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(conv.huslp.lch([H, S, L]))));
    };

    root.p.toHex = function(H, S, L) {
        return conv.rgb.hex(conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(conv.huslp.lch([H, S, L])))));
    };

    root.p.fromRGB = function(R, G, B) {
        return conv.lch.huslp(conv.luv.lch(conv.xyz.luv(conv.rgb.xyz([R, G, B]))));
    };

    root.p.fromHex = function(hex) {
        return conv.lch.huslp(conv.luv.lch(conv.xyz.luv(conv.rgb.xyz(conv.hex.rgb(hex)))));
    };

    root._conv = conv;

    root._getBounds = getBounds;

    root._maxChromaForLH = maxChromaForLH;

    root._maxSafeChromaForL = maxSafeChromaForL;

    libhusl = root

}).call(this);
