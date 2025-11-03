import { ExecuteRecordSetQry, ExecuteQry } from '../config/connect.js';


export async function GetLatestPrice(stockNo, ItemCode, ReferenceDate) {

  try {
    const query = `
    SELECT d_price 
    FROM DT_SMS1.dbo.uf_item_list_disc(
      (SELECT TOP 1 s_barcode_no 
       FROM erpdata_new.dbo.item 
       WHERE s_item_desc = '${stockNo}'),
      '${ItemCode}',
      '${ReferenceDate}'
    )
  `;

    const result = await ExecuteRecordSetQry(query);
    return result.recordset
  } catch (error) {
    console.log(error.error)
  }

}


export async function GetSearchItem(stockNo) {
  const qry = `
    -- Get item details
    SELECT 
      '' AS s_transaction_number,
      RTRIM(s_item_desc) AS s_item_desc,
      RTRIM(s_item_code) AS s_item_code,
      RTRIM(s_color) AS s_color,
      RTRIM(s_size) AS s_size,
      0 AS d_qty
    FROM erpdata_new.dbo.item
    WHERE 
      (s_item_desc = '${stockNo}' OR s_barcode_no = '${stockNo}')
      AND c_active = 'Y'
    ORDER BY s_color, s_size;

    -- Get latest unit price
    SELECT TOP 1 
      CAST(d_unit_price AS DECIMAL(13,2)) AS d_unit_price  
    FROM erpdata_new.dbo.price_list
    WHERE 
      s_item_code IN (
        SELECT s_item_code 
        FROM erpdata_new.dbo.item 
        WHERE s_item_desc = '${stockNo}' OR s_barcode_no = '${stockNo}'
      )
      AND s_price_list_type_code = 'MCJIM'
      AND dt_effective <= GETDATE()
    ORDER BY dt_effective DESC;
  `;

  const result = await ExecuteRecordSetQry(qry);

  const items = result.recordsets[0] || [];
  const price = result.recordsets[1]?.[0]?.d_unit_price || 0;

  return { items, price };
}




//  Generate new TRQ number
export async function GenerateNewTRQ() {

  try {
    const query = `
    
DECLARE @d_last_trq_number INT;
DECLARE @s_new_trq_number VARCHAR(20);
DECLARE @last_trq_number VARCHAR(20);
DECLARE @last_num INT;

BEGIN TRANSACTION;

-- Step 1: Get the last TRQ number from header
SELECT TOP 1 @last_trq_number = s_trq_number
FROM erpdata_new.dbo.im_trq_header
ORDER BY s_trq_number DESC;

-- Extract numeric part (after 'TRQ')
SET @last_num = CASE 
                  WHEN @last_trq_number IS NOT NULL 
                  THEN CAST(SUBSTRING(@last_trq_number, 4, LEN(@last_trq_number)) AS INT)
                  ELSE 0
                END;

-- Step 2: Get current counter from format table with row lock
SELECT @d_last_trq_number = s_suf_s_last_trq_number
FROM erpdata_new.dbo.im_transaction_number_format WITH (UPDLOCK, HOLDLOCK);

-- Step 3: Sync counter if behind
IF @d_last_trq_number < @last_num
    SET @d_last_trq_number = @last_num;

-- Step 4: Increment counter
SET @d_last_trq_number = DT_SMS1.dbo.uf_increment_num(@d_last_trq_number);

-- Step 5: Save updated counter
UPDATE erpdata_new.dbo.im_transaction_number_format
SET s_suf_s_last_trq_number = @d_last_trq_number;

-- Step 6: Generate new TRQ number (following your original logic)
SELECT @s_new_trq_number = s_pre_s_last_trq_number
                          + s_mid_s_last_trq_number
                          + RIGHT('00000' + CONVERT(VARCHAR(10), @d_last_trq_number),
                                  10 - (LEN(s_pre_s_last_trq_number) + LEN(s_mid_s_last_trq_number)))
FROM (
    SELECT  
        RTRIM(s_pre_s_last_trq_number) AS s_pre_s_last_trq_number,
        CASE 
            WHEN s_mid_s_last_trq_number = 'YY' THEN RIGHT(CONVERT(VARCHAR(4), YEAR(GETDATE())), 2)
            WHEN s_mid_s_last_trq_number = 'YYYY' THEN CONVERT(VARCHAR(4), YEAR(GETDATE()))
            WHEN s_mid_s_last_trq_number = 'MM' THEN RIGHT('00' + CONVERT(VARCHAR(2), MONTH(GETDATE())),2)
            WHEN s_mid_s_last_trq_number = 'MMYY' THEN RIGHT('00' + CONVERT(VARCHAR(2), MONTH(GETDATE())),2) 
                                                     + RIGHT(CONVERT(VARCHAR(4), YEAR(GETDATE())), 2)
            ELSE RIGHT(CONVERT(VARCHAR(4), YEAR(GETDATE())), 2)
        END AS s_mid_s_last_trq_number
    FROM erpdata_new.dbo.im_transaction_number_format
) aa;

-- Step 7: Update IM control table
UPDATE erpdata_new.dbo.im_control
SET s_last_trq_number = @s_new_trq_number;

COMMIT TRANSACTION;

-- Step 8: Return new TRQ number
SELECT @s_new_trq_number AS newTrq_number;
`;

    const result = await ExecuteRecordSetQry(query);
    return result.recordset;

  } catch (error) {
    console.log('Server Error')
    return error
  }

}



// Insert into trq header after generating the trq number
export async function InsertInterTRQ(
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
) {
  try {
    const safe = (val) => (val ? val.toString().replace(/'/g, "''") : '');

    // default to "INTERNAL" if empty
    const safe_order_type = s_to_order_type_code && s_to_order_type_code.trim() !== ''
      ? s_to_order_type_code
      : 'INTERNAL';

    const query = `
    INSERT INTO erpdata_new.dbo.im_trq_header (
      s_trq_number, 
      s_transfer_type,
      dt_doc_date, 
      s_entity_code,
      s_entity_name, 
      s_requested_by,
      dt_required_date, 
      s_dept_code,
      c_status, 
      c_finalized, 
      c_closed, 
      s_int_remarks,
      s_ext_remarks, 
      s_encoded_by,
      dt_encoded, 
      s_posted_by,
      dt_posted, 
      i_version,
      c_req_tpl, 
      s_dest_location,
      s_trans_fixed_type, 
      s_trans_order_type,
      s_loc_group_code, 
      c_require_consolidation
    )
    VALUES (
      '${safe(s_new_trq_number)}', '${safe(s_transfer_type)}',
      CAST(GETDATE() AS DATE), '${safe(s_entity_code)}',
      '${safe(s_entity_name)}', '${safe(s_encoded_by)}',
      '${safe(RequiredDate)}', '${safe('')}', -- keep alignment
      'S', 'Y', 'N',
      '${InternalRemarks.replace("'", "''").replace('_', ':')}*SRC:${SourceLocation}',
      '${safe(ExternalRemarks)}', '${safe(s_encoded_by)}',
      GETDATE(), '${safe(s_encoded_by)}',
      GETDATE(), 1,
      '${safe(s_requires_tpl)}',
      '${safe(s_dest_loc_code)}',
      '${safe(s_trans_fixed_type)}', '${safe(safe_order_type)}',
      '${safe(s_dest_territory_code)}', 'N'
    )`;

    const result = await ExecuteQry(query); // make sure ExecuteQry is async
    console.log("Insert successful for TRQ:", s_new_trq_number);
    return result;
  } catch (error) {
    console.log("InsertInterTRQ error:", error);
    return error;
  }
}



export async function InsertItelList(itemsList, s_new_trq_number) {
  try {
    // ✅ Filter and simplify items
    const simplifiedItems = itemsList.map(i => ({
      itemCode: i.s_item_code || i.itemCode || '',
      d_qty_requested: i.d_qty || i.d_qty_requested || 0,
      d_qty_to_pick: i.d_qty || i.d_qty_to_pick || 0,
      s_ext_remarks: i.s_ext_remarks || ''
    }));

    let query = `
      INSERT INTO erpdata_new.dbo.im_trq_detail (
        s_trq_number,
        s_item_code,
        s_um_code,
        d_qty_requested,
        d_qty_requested_p,
        d_qty_for_picking,
        d_qty_to_pick_p,
        d_qty_to_pick,
        d_qty_picked_p,
        d_qty_picked,
        d_qty_pick_act_p,
        d_qty_issued,
        d_qty_issued_p,
        s_int_remarks,
        d_total_cost,
        i_tag
      ) VALUES
    `;

    query += simplifiedItems
      .map(
        (current, idx) => `
        ('${s_new_trq_number}',
         '${current.itemCode}',
         'PCS',
         '${current.d_qty_requested}',
         '0',
         '${current.d_qty_to_pick}',
         '0',
         '${current.d_qty_to_pick}',
         '0',
         '0',
         '0',
         '0',
         '0',
         '${current.s_ext_remarks}',
         0,
         1)${idx === simplifiedItems.length - 1 ? '' : ','}
      `
      )
      .join('');

    await ExecuteQry(query);

    return { success: true, message: 'All items inserted successfully' };
  } catch (error) {
    console.error('InsertItelList Error:', error);
    return { success: false, message: error.message };
  }
}


//  for inserting to im_trq_detail2

export async function InsertTo_Trq_Detail2(trq_number, Items, boxDetails) {
  try {


    let qry = `
      INSERT INTO mcjim_all_prog.dbo.im_trq_detail_2 
      (s_trq_number, s_item_code_box_code, d_qty)
      VALUES 
    `;

    const allValues = [];

    // 🧠 Normalize to array even if only one box
    const boxes = Array.isArray(boxDetails)
      ? boxDetails
      : boxDetails
      ? [boxDetails]
      : [];

    if (boxes.length > 0) {
      console.log(`📦 Inserting ${boxes.length} box(es) for TRQ ${trq_number}`);
      for (const box of boxes) {
        if (!box.BoxNumber) continue;
        allValues.push(`('${trq_number}', '${box.BoxNumber}', 1)`);
      }
    } else {
      console.log("🧩 No boxes found — inserting per item instead");
      const perItemValues = Items.map(item =>
        `('${trq_number}', '${item.s_item_code}', ${item.d_qty || 0})`
      );
      allValues.push(...perItemValues);
    }

    if (allValues.length === 0) {
      throw new Error("No valid boxDetails or Items found to insert.");
    }

    qry += allValues.join(",") + ";";

    console.log("🧩 Final Query:", qry);

    const result = await ExecuteQry(qry);

    return { success: true, inserted: allValues.length, result };
  } catch (error) {
    console.error("❌ InsertTo_Trq_Detail2 Error:", error);
    return { success: false, message: error.message };
  }
}


export async function InternalTransfer_Get_Reference_TD(TRQ_number) {

  try {
    const query = `
     select top 1 s_to_number from erpdata_new.dbo.to_source_detail
     where s_ref_doc_number = '${TRQ_number}'
  `;

    const result = await ExecuteRecordSetQry(query);

    return result.recordsets;
  } catch (error) {
    console.log(error)
  }
}


//  FOR PER BOX SCANNING AND INPUT
export async function CheckIfItemBoxIsExist(ItemBox) {

  try {
    const query = `SELECT COUNT(*) as Itembox
      FROM mcjim_all_prog.dbo.boxing_header
      WHERE s_transaction_number = '${ItemBox}'
      `;

    // ✅ Await the query result
    const result = await ExecuteRecordSetQry(query);
    const count = result.recordset[0].Itembox;
    return count;

  } catch (error) {
    console.log(error)
  }
}



// check if the item box is already used
export async function CheckIfBoxIsAlredUse(itemBox) {
  try {
    const qry = `
      SELECT CASE 
        WHEN s_int_ref_doc_num IS NULL THEN '' 
        ELSE s_int_ref_doc_num 
      END AS s_result
      FROM mcjim_all_prog.dbo.boxing_header
      WHERE s_transaction_number = '${itemBox}'
    `;

    // Must await the query execution
    const result = await ExecuteRecordSetQry(qry);

    //Safely extract the first record
    const s_result = result?.recordset?.length > 0 ? result.recordset[0].s_result : "";

    return s_result; // returns '' if not found, or actual value if exists
  } catch (error) {
    console.log("Error in CheckIfBoxIsAlredUse:", error);
    return error.message;
  }
}


export async function GeItemsByItemBox(itemBox) {

  try {
    const query = `
       select s_item_desc
          , item.s_item_code
          , s_color
          , s_size
          ,cast(d_qty as int) as d_qty

          from mcjim_all_prog.dbo.boxing_detail bd
          inner join erpdata_new.dbo.item item
          on bd.s_item_code = item.s_item_code
          where s_transaction_number = '${itemBox}'
     `;

    const result = await ExecuteRecordSetQry(query);
    const Items = result.recordset

    return Items;
  } catch (error) {

  }
}


export async function UpdateBoxing(Box_Details) {
  console.log(Box_Details)
  try {
    let updatedCount = 0; //  track how many boxes were updated

    for (const detail of Box_Details) {
      const query = `
        UPDATE mcjim_all_prog.dbo.boxing_header
        SET s_int_ref_doc_num = '${detail.Trq_number}'
        WHERE s_box_id = '${detail.BoxNumber}'
      `;
      await ExecuteQry(query);
    }

    //  return a clean result
    return {
      success: true,
      message: `${updatedCount} box${updatedCount > 1 ? "es" : ""} updated successfully`
    };
  } catch (error) {
    console.error("❌ UpdateBoxing error:", error);
    return { success: false, error: error.message };
  }
}



//  Insert to Boxing Detail
export async function InsertToBoxingDetail(BoxDetails, ItemDetails) {
  try {
    for (const box of BoxDetails) {
      for (const item of ItemDetails) {
        const query = `
          INSERT INTO mcjim_all_prog.dbo.boxing_detail (
              s_transaction_number,
              s_item_code,
              d_qty
          )
          VALUES (
              '${box.BoxNumber}', 
              '${item.s_item_code}', 
              '${item.d_qty}'
          )
        `;
        await ExecuteQry(query);
      }
    }

    return { success: true, message: " All boxing details inserted successfully." };
  } catch (error) {
    console.error("InsertToBoxingDetail error:", error);
    return { success: false, error: error.message };
  }
}



//  Create a Task for Internal Transfer

