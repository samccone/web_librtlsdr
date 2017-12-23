var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define("device_lookup", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var KNOWN_DEVICE_INDICIES;
    (function (KNOWN_DEVICE_INDICIES) {
        KNOWN_DEVICE_INDICIES[KNOWN_DEVICE_INDICIES["VENDOR_ID"] = 0] = "VENDOR_ID";
        KNOWN_DEVICE_INDICIES[KNOWN_DEVICE_INDICIES["PRODUCT_ID"] = 1] = "PRODUCT_ID";
        KNOWN_DEVICE_INDICIES[KNOWN_DEVICE_INDICIES["PRODUCE_NAME"] = 2] = "PRODUCE_NAME";
    })(KNOWN_DEVICE_INDICIES || (KNOWN_DEVICE_INDICIES = {}));
    // https://github.com/steve-m/librtlsdr/blob/18bf26989c926a5db4fca29e7d859af42af1437c/src/librtlsdr.c#L312
    const KNOWN_DEVICES = [
        [0x0bda, 0x2832, "Generic RTL2832U"],
        [0x0bda, 0x2838, "Generic RTL2832U OEM"],
        [0x0413, 0x6680, "DigitalNow Quad DVB-T PCI-E card"],
        [0x0413, 0x6f0f, "Leadtek WinFast DTV Dongle mini D"],
        [0x0458, 0x707f, "Genius TVGo DVB-T03 USB dongle (Ver. B)"],
        [0x0ccd, 0x00a9, "Terratec Cinergy T Stick Black (rev 1)"],
        [0x0ccd, 0x00b3, "Terratec NOXON DAB/DAB+ USB dongle (rev 1)"],
        [0x0ccd, 0x00b4, "Terratec Deutschlandradio DAB Stick"],
        [0x0ccd, 0x00b5, "Terratec NOXON DAB Stick - Radio Energy"],
        [0x0ccd, 0x00b7, "Terratec Media Broadcast DAB Stick"],
        [0x0ccd, 0x00b8, "Terratec BR DAB Stick"],
        [0x0ccd, 0x00b9, "Terratec WDR DAB Stick"],
        [0x0ccd, 0x00c0, "Terratec MuellerVerlag DAB Stick"],
        [0x0ccd, 0x00c6, "Terratec Fraunhofer DAB Stick"],
        [0x0ccd, 0x00d3, "Terratec Cinergy T Stick RC (Rev.3)"],
        [0x0ccd, 0x00d7, "Terratec T Stick PLUS"],
        [0x0ccd, 0x00e0, "Terratec NOXON DAB/DAB+ USB dongle (rev 2)"],
        [0x1554, 0x5020, "PixelView PV-DT235U(RN)"],
        [0x15f4, 0x0131, "Astrometa DVB-T/DVB-T2"],
        [0x15f4, 0x0133, "HanfTek DAB+FM+DVB-T"],
        [0x185b, 0x0620, "Compro Videomate U620F"],
        [0x185b, 0x0650, "Compro Videomate U650F"],
        [0x185b, 0x0680, "Compro Videomate U680F"],
        [0x1b80, 0xd393, "GIGABYTE GT-U7300"],
        [0x1b80, 0xd394, "DIKOM USB-DVBT HD"],
        [0x1b80, 0xd395, "Peak 102569AGPK"],
        [0x1b80, 0xd397, "KWorld KW-UB450-T USB DVB-T Pico TV"],
        [0x1b80, 0xd398, "Zaapa ZT-MINDVBZP"],
        [0x1b80, 0xd39d, "SVEON STV20 DVB-T USB & FM"],
        [0x1b80, 0xd3a4, "Twintech UT-40"],
        [0x1b80, 0xd3a8, "ASUS U3100MINI_PLUS_V2"],
        [0x1b80, 0xd3af, "SVEON STV27 DVB-T USB & FM"],
        [0x1b80, 0xd3b0, "SVEON STV21 DVB-T USB & FM"],
        [0x1d19, 0x1101, "Dexatek DK DVB-T Dongle (Logilink VG0002A)"],
        [0x1d19, 0x1102, "Dexatek DK DVB-T Dongle (MSI DigiVox mini II V3.0)"],
        [0x1d19, 0x1103, "Dexatek Technology Ltd. DK 5217 DVB-T Dongle"],
        [0x1d19, 0x1104, "MSI DigiVox Micro HD"],
        [0x1f4d, 0xa803, "Sweex DVB-T USB"],
        [0x1f4d, 0xb803, "GTek T803"],
        [0x1f4d, 0xc803, "Lifeview LV5TDeluxe"],
        [0x1f4d, 0xd286, "MyGica TD312"],
        [0x1f4d, 0xd803, "PROlectrix DV107669"]
    ];
    function findProductNameFromVendorAndProductId(vendorId, productId) {
        for (const device of KNOWN_DEVICES) {
            if (device[KNOWN_DEVICE_INDICIES.VENDOR_ID] === vendorId &&
                device[KNOWN_DEVICE_INDICIES.PRODUCT_ID] === productId) {
                return device[KNOWN_DEVICE_INDICIES.PRODUCE_NAME];
            }
        }
        return null;
    }
    exports.findProductNameFromVendorAndProductId = findProductNameFromVendorAndProductId;
});
define("main", ["require", "exports", "device_lookup"], function (require, exports, device_lookup_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var USB_REG;
    (function (USB_REG) {
        USB_REG[USB_REG["USB_SYSCTL"] = 8192] = "USB_SYSCTL";
        USB_REG[USB_REG["USB_CTRL"] = 8208] = "USB_CTRL";
        USB_REG[USB_REG["USB_STAT"] = 8212] = "USB_STAT";
        USB_REG[USB_REG["USB_EPA_CFG"] = 8516] = "USB_EPA_CFG";
        USB_REG[USB_REG["USB_EPA_CTL"] = 8520] = "USB_EPA_CTL";
        USB_REG[USB_REG["USB_EPA_MAXPKT"] = 8536] = "USB_EPA_MAXPKT";
        USB_REG[USB_REG["USB_EPA_MAXPKT_2"] = 8538] = "USB_EPA_MAXPKT_2";
        USB_REG[USB_REG["USB_EPA_FIFO_CFG"] = 8544] = "USB_EPA_FIFO_CFG";
    })(USB_REG || (USB_REG = {}));
    var BLOCKS;
    (function (BLOCKS) {
        BLOCKS[BLOCKS["DEMODB"] = 0] = "DEMODB";
        BLOCKS[BLOCKS["USBB"] = 1] = "USBB";
        BLOCKS[BLOCKS["SYSB"] = 2] = "SYSB";
        BLOCKS[BLOCKS["TUNB"] = 3] = "TUNB";
        BLOCKS[BLOCKS["ROMB"] = 4] = "ROMB";
        BLOCKS[BLOCKS["IRB"] = 5] = "IRB";
        BLOCKS[BLOCKS["IICB"] = 6] = "IICB";
    })(BLOCKS || (BLOCKS = {}));
    // https://github.com/steve-m/librtlsdr/blob/18bf26989c926a5db4fca29e7d859af42af1437c/src/librtlsdr.c#L382
    var SYS_REG;
    (function (SYS_REG) {
        SYS_REG[SYS_REG["DEMOD_CTL"] = 12288] = "DEMOD_CTL";
        SYS_REG[SYS_REG["GPO"] = 12289] = "GPO";
        SYS_REG[SYS_REG["GPI"] = 12290] = "GPI";
        SYS_REG[SYS_REG["GPOE"] = 12291] = "GPOE";
        SYS_REG[SYS_REG["GPD"] = 12292] = "GPD";
        SYS_REG[SYS_REG["SYSINTE"] = 12293] = "SYSINTE";
        SYS_REG[SYS_REG["SYSINTS"] = 12294] = "SYSINTS";
        SYS_REG[SYS_REG["GP_CFG0"] = 12295] = "GP_CFG0";
        SYS_REG[SYS_REG["GP_CFG1"] = 12296] = "GP_CFG1";
        SYS_REG[SYS_REG["SYSINTE_1"] = 12297] = "SYSINTE_1";
        SYS_REG[SYS_REG["SYSINTS_1"] = 12298] = "SYSINTS_1";
        SYS_REG[SYS_REG["DEMOD_CTL_1"] = 12299] = "DEMOD_CTL_1";
        SYS_REG[SYS_REG["IR_SUSPEND"] = 12300] = "IR_SUSPEND";
    })(SYS_REG || (SYS_REG = {}));
    var USBRequestType;
    (function (USBRequestType) {
        USBRequestType["STANDARD"] = "standard";
        USBRequestType["CLASS"] = "class";
        USBRequestType["VENDOR"] = "vendor";
    })(USBRequestType || (USBRequestType = {}));
    var USBRecipient;
    (function (USBRecipient) {
        USBRecipient["DEVICE"] = "device";
        USBRecipient["INTERFACE"] = "interface";
        USBRecipient["ENDPOINT"] = "endpoint";
        USBRecipient["OTHER"] = "other";
    })(USBRecipient || (USBRecipient = {}));
    function run() {
        return __awaiter(this, void 0, void 0, function* () {
            let devices = yield navigator.usb.getDevices();
            devices.forEach((device) => __awaiter(this, void 0, void 0, function* () {
                yield handleDevice(device);
            }));
            document.querySelector("#auth").addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                const requestedDevice = yield navigator.usb.requestDevice({ filters: [] });
                handleDevice(requestedDevice);
            }));
        });
    }
    exports.run = run;
    function handleDevice(device) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = device_lookup_1.findProductNameFromVendorAndProductId(device.vendorId, device.productId);
            if (product != null) {
                console.info(`Found device ${product}`);
                yield device.open();
                const openInterface = yield getOpenInterfaceNumber(device);
                if (openInterface == null) {
                    throw new Error("Unable to find open interface.");
                }
                yield device.claimInterface(openInterface);
                console.info(`Interface ${openInterface} claimed`);
                /* perform a dummy write, if it fails, reset the device */
                yield rtlsdr_write_reg(device, BLOCKS.USBB, USB_REG.USB_SYSCTL, 0x09, 1);
            }
            else {
                throw new Error("Unknown device found.");
            }
        });
    }
    function getOpenInterfaceNumber(device) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const config of device.configurations) {
                for (const iface of config.interfaces) {
                    if (!iface.claimed) {
                        return iface.interfaceNumber;
                    }
                }
            }
            return null;
        });
    }
    function rtlsdr_write_reg(device, block, addr, val, len) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = new Uint8Array(2);
            const index = (block << 8) | 0x10;
            if (len == 1) {
                data[0] = val & 0xff;
            }
            else {
                data[0] = val >> 8;
            }
            data[1] = val & 0xff;
            // r = libusb_control_transfer(dev->devh, CTRL_OUT, 0, addr, index, data, len, CTRL_TIMEOUT);
            const r = yield device.controlTransferOut({
                requestType: USBRequestType.VENDOR,
                recipient: USBRecipient.DEVICE,
                index,
                request: addr,
                value: val
            }, data);
            if (r.status !== "ok") {
                throw new Error(`Failed with response code ${r}`);
            }
        });
    }
});
// function rtlsdr_init_baseband(dev: USBDevice) {
//   /* initialize USB */
//   rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_SYSCTL, 0x09, 1);
//   rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_EPA_MAXPKT, 0x0002, 2);
//   rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_EPA_CTL, 0x1002, 2);
//   /* poweron demod */
//   rtlsdr_write_reg(dev, BLOCKS.SYSB, SYS_REG.DEMOD_CTL_1, 0x22, 1);
//   rtlsdr_write_reg(dev, BLOCKS.SYSB, SYS_REG.DEMOD_CTL, 0xe8, 1);
//   /* reset demod (bit 3, soft_rst) */
//   rtlsdr_demod_write_reg(dev, 1, 0x01, 0x14, 1);
//   rtlsdr_demod_write_reg(dev, 1, 0x01, 0x10, 1);
//   /* disable spectrum inversion and adjacent channel rejection */
//   rtlsdr_demod_write_reg(dev, 1, 0x15, 0x00, 1);
//   rtlsdr_demod_write_reg(dev, 1, 0x16, 0x0000, 2);
//   /* clear both DDC shift and IF frequency registers  */
//   for (let i = 0; i < 6; i++) {
//     rtlsdr_demod_write_reg(dev, 1, 0x16 + i, 0x00, 1);
//   }
//   rtlsdr_set_fir(dev);
//   /* enable SDR mode, disable DAGC (bit 5) */
//   rtlsdr_demod_write_reg(dev, 0, 0x19, 0x05, 1);
//   /* init FSM state-holding register */
//   rtlsdr_demod_write_reg(dev, 1, 0x93, 0xf0, 1);
//   rtlsdr_demod_write_reg(dev, 1, 0x94, 0x0f, 1);
//   /* disable AGC (en_dagc, bit 0) (this seems to have no effect) */
//   rtlsdr_demod_write_reg(dev, 1, 0x11, 0x00, 1);
//   /* disable RF and IF AGC loop */
//   rtlsdr_demod_write_reg(dev, 1, 0x04, 0x00, 1);
//   /* disable PID filter (enable_PID = 0) */
//   rtlsdr_demod_write_reg(dev, 0, 0x61, 0x60, 1);
//   /* opt_adc_iq = 0, default ADC_I/ADC_Q datapath */
//   rtlsdr_demod_write_reg(dev, 0, 0x06, 0x80, 1);
//   /* Enable Zero-IF mode (en_bbin bit), DC cancellation (en_dc_est),
// 	 * IQ estimation/compensation (en_iq_comp, en_iq_est) */
//   rtlsdr_demod_write_reg(dev, 1, 0xb1, 0x1b, 1);
//   /* disable 4.096 MHz clock output on pin TP_CK0 */
//   rtlsdr_demod_write_reg(dev, 0, 0x0d, 0x83, 1);
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldmljZV9sb29rdXAudHMiLCJtYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUEsSUFBSyxxQkFJSjtJQUpELFdBQUsscUJBQXFCO1FBQ3hCLDJFQUFTLENBQUE7UUFDVCw2RUFBVSxDQUFBO1FBQ1YsaUZBQVksQ0FBQTtJQUNkLENBQUMsRUFKSSxxQkFBcUIsS0FBckIscUJBQXFCLFFBSXpCO0lBRUQsMEdBQTBHO0lBQzFHLE1BQU0sYUFBYSxHQUFHO1FBQ3BCLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQztRQUNwQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsc0JBQXNCLENBQUM7UUFDeEMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGtDQUFrQyxDQUFDO1FBQ3BELENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxtQ0FBbUMsQ0FBQztRQUNyRCxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUseUNBQXlDLENBQUM7UUFDM0QsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLHdDQUF3QyxDQUFDO1FBQzFELENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSw0Q0FBNEMsQ0FBQztRQUM5RCxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUscUNBQXFDLENBQUM7UUFDdkQsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLHlDQUF5QyxDQUFDO1FBQzNELENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxvQ0FBb0MsQ0FBQztRQUN0RCxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsdUJBQXVCLENBQUM7UUFDekMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixDQUFDO1FBQzFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxrQ0FBa0MsQ0FBQztRQUNwRCxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsK0JBQStCLENBQUM7UUFDakQsQ0FBQyxNQUFNLEVBQUUs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