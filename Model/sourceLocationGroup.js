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

