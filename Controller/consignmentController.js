import { LoadBarcodeType, SKU_VALIDATION } from "../Model/Consignment.js";




export async function Check_Item_SKU(req, res) {
    try {
        const { stockNumber, UnitPrice, desLocationCode } = req.body;

        let s_barcode_type;
        let s_sku_type;

        // 1️⃣ Load barcode type (mock or helper)
        const result1 = await LoadBarcodeType(desLocationCode);

        switch (desLocationCode) {
            case "JMI":
            case "STICKER":
            case "BR0":
            case "BR":
            case "BR2":
                s_barcode_type = "REGULAR";
                break;
            default:
                s_barcode_type = result1?.s_barcod_type || "REGULAR";
                break;
        }

        // 2️⃣ Determine SKU type
        switch (s_barcode_type) {
            case "x":
            case "LGE":
            case "BHQ":
            case "LSP":
            case "SLE":
            case "TIONGSAN":
            case "BIGA":
            case "PV":
                s_sku_type = "REGULAR";
                break;

            case "METRO_NS":
                s_sku_type = "METRO";
                break;

            default:
                s_sku_type = s_barcode_type;
                break;
        }

        // 3️⃣ Get SKU validation results

        const result2 = await SKU_VALIDATION(stockNumber, UnitPrice);

        // Parse nested data safely
        const priceData =
            Array.isArray(result2) && Array.isArray(result2[0])
                ? result2[0][0] || {}
                : {};

        // Handle nested structure safely
        const skuData =
            Array.isArray(result2) && Array.isArray(result2[1])
                ? result2[1][0] || {}
                : result2 || {};

        console.log("📦 SKU VALIDATION raw:", result2);
        console.log("📦 SKU VALIDATION parsed:", skuData);

        const {
            s_sm_sku_count,
            s_rob_sku_count,
            s_icm_sku_count,
            s_metro_sku_count,
            Kcc,
            Victoria,
            s_landmark_sku_count,
        } = skuData;

        const { d_unit_price = null } = priceData;

        //  Compute final result
        let s_result;
        switch (s_sku_type) {
            case "REGULAR":
                s_result = "OK";
                break;
            case "SKU3":
                s_result = s_sm_sku_count;
                break;
            case "LM":
            case "LMT":
            case "LMA":
            case "LMN":
                s_result = "OK";
                break;
            case "ROBINSONS2":
                s_result = s_rob_sku_count;
                break;
            case "H&F":
                s_result = s_icm_sku_count;
                break;
            case "KCC":
                s_result = Kcc;
                break;
            case "METRO":
                s_result = s_metro_sku_count;
                break;
            case "VICTORIA":
                s_result = Victoria;
                break;
            case "WMDEPT":
            case "VMB":
            default:
                s_result = "X";
                break;
        }

        console.log(" SKU TYPE:", s_sku_type);
        console.log(" RESULT:", s_result);
        return res.json({
            s_result: s_result,
            s_sku_type,
            d_unit_price,
            breakdown: {
                s_sm_sku_count,
                s_rob_sku_count,
                s_icm_sku_count,
                s_metro_sku_count,
                Kcc,
                Victoria,
                s_landmark_sku_count,
            },
        });
    } catch (err) {
        console.error("❌ Error in Check_Item_SKU:", err);
        return res.status(500).json({
            message: "Internal Server Error",
            error: err.message,
        });
    }
}





export async function testSKU(req, res) {

    const { stockNumber, price } = req.body
    const result = await SKU_VALIDATION(stockNumber, price)

    return res.status(200).json({
        data: result
    })

}