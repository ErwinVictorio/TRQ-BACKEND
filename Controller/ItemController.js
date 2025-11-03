import { json } from "express";
import { GenerateNewTRQ, GetSearchItem, InsertInterTRQ, InternalTransfer_Get_Reference_TD, InsertItelList, InsertTo_Trq_Detail2, CheckIfItemBoxIsExist, CheckIfBoxIsAlredUse, GeItemsByItemBox, UpdateBoxing, InsertToBoxingDetail } from "../Model/iItems.js";
import { ExecuteQry } from "../config/connect.js";


export async function SearchItem(req, res) {
  try {
    const stockNo = req.body.stockNo || req.query.stockNo;
    const result = await GetSearchItem(stockNo);

    console.log(result);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item data',
      error: error.message,
    });
  }
}

export async function Get_Reference_TD(req, res) {
  try {
    const { TRQ_number } = req.query;

    const result = await InternalTransfer_Get_Reference_TD(TRQ_number);

    if (!result) {
      return res.status(200).json({ message: "No TDIN Number Found" })
    }

    return res.status(200).json({ message: result })

  } catch (error) {
    console.error("Error in Get_Reference_TD:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}




export async function GenerateTrqNumber(req, res) {
  try {
    const result = await GenerateNewTRQ();

    if (result) {
      return res.status(200).json({
        success: true,
        message: result
      })
    }

  } catch (error) {
    return res.status(200).json({
      success: false,
      message: error
    })
  }

}


export async function Store_to_trq_header(req, res) {

  const {
    s_transfer_type,
    s_entity_code,
    s_entity_name,
    s_encoded_by,
    RequiredDate,
    s_requires_tpl,
    s_dest_loc_code,
    s_trans_fixed_type,
    InternalRemarks,
    ExternalRemarks,
    s_to_order_type_code,
    s_dest_territory_code,
    SourceLocation,
    s_new_trq_number

  } = req.body;

  console.log()

  try {
    const result = await InsertInterTRQ(
      s_transfer_type,
      s_entity_code,
      s_entity_name,
      s_encoded_by,
      RequiredDate,
      s_requires_tpl,
      s_dest_loc_code,
      s_trans_fixed_type,
      InternalRemarks,
      ExternalRemarks,
      s_to_order_type_code,
      s_dest_territory_code,
      SourceLocation,
      s_new_trq_number
    );

    if (result) {
      return res.status(200).json({
        message: result
      })
    }
  } catch (error) {
    console.log(error)
  }

}



export async function InsertTo_Trq_detail(req, res) {
  try {
    const { s_new_trq_number, itemsList, s_encoded_by } = req.body;

    if (!s_new_trq_number || !Array.isArray(itemsList) || itemsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request: missing TRQ number or items list."
      });
    }

    // 1️⃣ Insert item list
    const result = await InsertItelList(itemsList, s_new_trq_number);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }

    // 2️⃣ After successful insert, run stored procedure
    const spQuery = `
      USE mcjim_all_prog;
      EXEC sp_create_transfer_delivery '${s_new_trq_number}', '${s_encoded_by}';
    `;

    await ExecuteQry(spQuery);

    // 3️⃣ Success response
    res.status(200).json({
      success: true,
      message: `✅ TRQ detail inserted and delivery created successfully for ${s_new_trq_number}.`
    });

  } catch (error) {
    console.error("InsertTo_Trq_detail Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while inserting TRQ details.",
      error: error.message
    });
  }
}



export async function Get_TDIN_number(req, res) {

  const { trq_number } = req.body;

  try {
    const result = await InternalTransfer_Get_Reference_TD(trq_number);
    return res.status(200).json({
      TdinNumber: result[0]
    })
  } catch (error) {
    return res.status(500).json({
      message: result
    })
  }
}



export async function InsertTo_trq_2(req, res) {
  const { trq_number, Items, boxDetails } = req.body;

  try {
    console.log("📦 Received boxDetails:", boxDetails);

    const result = await InsertTo_Trq_Detail2(trq_number, Items, boxDetails);

    return res.status(200).json({
      success: true,
      message: "Insert successful for TRQ: " + trq_number,
      result
    });
  } catch (error) {
    console.error("❌ InsertTo_trq_2 Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}


//  FOR PER BOX SCANNING AND INPUT


export async function CheckiIsBox_Exist(req, res) {

  const { BoxNumber } = req.body;

  try {
    const result = await CheckIfItemBoxIsExist(BoxNumber)

    return res.status(200).json({
      Box: result
    })

  } catch (error) {
    console.log(error)
  }
}


//  check if the item box is alredy use 

export async function CheckiIsBox_Use(req, res) {

  const { BoxNumber } = req.body;

  try {
    const result = await CheckIfBoxIsAlredUse(BoxNumber)

    return res.status(200).json({
      Box: result
    })
  } catch (error) {
    console.log(error)
  }
}



export async function GetItemByBoxNumber(req, res) {

  const { BoxNumber } = req.body;

  try {
    const Items = await GeItemsByItemBox(BoxNumber);

    if (Items) {
      return res.status(200).json({
        success: true,
        Items: Items
      })
    }
  } catch (error) {
    console.log(error)
    return error.message
  }
}



export async function UpdateBox(req, res) {


  try {
    const { Box_Details } = req.body;
    const result = await UpdateBoxing(Box_Details);

    return res.status(200).json({
      success: true,
      message: result
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }

}


export async function InsertHeaderDetail(req, res) {

  const { BoxDetails, ItemDetails } = req.body;

  try {
    const result = await InsertToBoxingDetail(BoxDetails, ItemDetails);

    return res.status(200).json({
      success: true,
      message: result
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
