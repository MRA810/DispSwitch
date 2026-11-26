# ddc_helper.ps1 — DDC/CI monitor input control for Windows
# Uses the Windows Monitor Configuration API (dxva2.dll) via C# P/Invoke
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File ddc_helper.ps1 get
#   powershell -NoProfile -ExecutionPolicy Bypass -File ddc_helper.ps1 set 0x0f

param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("get", "set")]
    [string]$Action,

    [Parameter(Position = 1)]
    [string]$Value
)

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class DDCHelper
{
    // ---- Win32 / DXVA2 imports ----

    delegate bool EnumMonitorsDelegate(
        IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

    [DllImport("user32.dll")]
    static extern bool EnumDisplayMonitors(
        IntPtr hdc, IntPtr lprcClip, EnumMonitorsDelegate lpfnEnum, IntPtr dwData);

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct PHYSICAL_MONITOR
    {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string szPhysicalMonitorDescription;
    }

    [DllImport("dxva2.dll")]
    static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(
        IntPtr hMonitor, out uint count);

    [DllImport("dxva2.dll")]
    static extern bool GetPhysicalMonitorsFromHMONITOR(
        IntPtr hMonitor, uint count, [Out] PHYSICAL_MONITOR[] monitors);

    [DllImport("dxva2.dll")]
    static extern bool GetVCPFeatureAndVCPFeatureReply(
        IntPtr hMonitor, byte code, out uint pvct, out uint current, out uint maximum);

    [DllImport("dxva2.dll")]
    static extern bool SetVCPFeature(IntPtr hMonitor, byte code, uint value);

    [DllImport("dxva2.dll")]
    static extern bool DestroyPhysicalMonitor(IntPtr hMonitor);

    // ---- Enumerate logical monitors ----

    static List<IntPtr> hMonitors = new List<IntPtr>();

    static bool MonitorCallback(IntPtr hMon, IntPtr hdc, ref RECT r, IntPtr data)
    {
        hMonitors.Add(hMon);
        return true;
    }

    // ---- Public API ----

    /// <summary>Read VCP 0x60 (Input Source) from the first DDC/CI-capable monitor.</summary>
    public static string GetInputSource()
    {
        hMonitors.Clear();
        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, MonitorCallback, IntPtr.Zero);

        foreach (var hMon in hMonitors)
        {
            uint count;
            if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, out count) || count == 0)
                continue;

            var pms = new PHYSICAL_MONITOR[count];
            if (!GetPhysicalMonitorsFromHMONITOR(hMon, count, pms))
                continue;

            foreach (var pm in pms)
            {
                uint pvct, cur, max;
                bool ok = GetVCPFeatureAndVCPFeatureReply(
                    pm.hPhysicalMonitor, 0x60, out pvct, out cur, out max);
                DestroyPhysicalMonitor(pm.hPhysicalMonitor);
                if (ok)
                    return "0x" + cur.ToString("x2");
            }
        }
        return "error";
    }

    /// <summary>Write VCP 0x60 (Input Source) on the first DDC/CI-capable monitor.</summary>
    public static string SetInputSource(uint value)
    {
        hMonitors.Clear();
        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, MonitorCallback, IntPtr.Zero);

        foreach (var hMon in hMonitors)
        {
            uint count;
            if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, out count) || count == 0)
                continue;

            var pms = new PHYSICAL_MONITOR[count];
            if (!GetPhysicalMonitorsFromHMONITOR(hMon, count, pms))
                continue;

            foreach (var pm in pms)
            {
                bool ok = SetVCPFeature(pm.hPhysicalMonitor, 0x60, value);
                DestroyPhysicalMonitor(pm.hPhysicalMonitor);
                if (ok)
                    return "ok";
            }
        }
        return "error";
    }
}
"@

# ---- Entry point ----

if ($Action -eq "get") {
    [DDCHelper]::GetInputSource()
}
elseif ($Action -eq "set") {
    if (-not $Value) {
        Write-Error "Usage: ddc_helper.ps1 set <hex_value>  (e.g. 0x0f)"
        exit 1
    }
    $numericValue = [Convert]::ToUInt32($Value, 16)
    [DDCHelper]::SetInputSource($numericValue)
}
