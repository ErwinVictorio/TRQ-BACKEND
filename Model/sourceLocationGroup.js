import { ExecuteRecordSetQry } from '../config/connect.js';

export async function SearchLocationGroup(locationCode) {
  try {
    const query = `
      DECLARE @s_loc_group_code VARCHAR(20);
      SET @s_loc_group_code = '${locationCode}';

      SELECT 
          RTRIM(s_location_code) AS s_location_code,
          RTRIM(s_location_name) AS s_location_name,
          RTRIM(s_loc_group_code) AS s_loc_group_code
      FROM temporary_erp.dbo.location loc
      WHERE 
          (
              @s_loc_group_code = 'WAREHOUSE'
              AND s_loc_group_code = REPLACE(@s_loc_group_code, ' ', '')
              AND s_location_code IN ('BR','BR2','BR2-FI','BR1-EI','BR0','WH-PROD','EVENTSGRP')
          )
          OR
          (
              @s_loc_group_code <> 'WAREHOUSE'
              AND s_loc_group_code = REPLACE(@s_loc_group_code, ' ', '')
          );
    `;

    const result = await ExecuteRecordSetQry(query);
    return result?.recordset || [];
  } catch (error) {
    console.error("Error in SearchLocationGroup:", error);
    return [];
  }
}

//check if user has access to a location
export async function HasAccessLocation(username, locationCode) {
  try {
    const qry = `
      SELECT COUNT(*) AS access_count
      FROM erpdata_new.dbo.location_code_rights
      WHERE user_id = '${username}'
      AND s_location_code = '${locationCode}'
    `;

    const result = await ExecuteRecordSetQry(qry);
    const count = result?.recordset?.[0]?.access_count || 0;
    return count > 0;
  } catch (error) {
    console.error("Error in HasAccessLocation:", error);
    return false;
  }
}


//  load location into Consignment pag

export async function LoadLocationGroup() {

  try {
    const query = `
      select distinct s_entity_group  from (select  s_store_code
    ,s_store_name
    ,case when s_store_group is null then s_store_member else s_store_group end as s_entity_group
    from mcjim_all_prog.dbo.v_stores
    where s_store_member = 'WAREHOUSE'
    OR s_store_group in ('AREA 1','AREA 2','AREA 3','AREA 4', 'MAIN', 'EVENTS')) aa
  `

   const result = await ExecuteRecordSetQry(query);

   return result.recordset
  } catch (error) {
     return error.message
  }



}

