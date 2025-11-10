
import { ExecuteQry, ExecuteRecordSetQry } from "../config/connect.js"


export async function GetUserTaskPending(username) {

    try {
        const query = `
   SELECT  
    d_task_id
    ,c_is_parent
    ,d_parent_task
    ,s_reference_number
    ,s_recipient
    ,s_sender
    ,dt_sent
    ,s_subject
    ,s_details
    ,s_category_id
    ,s_category_name
    ,s_arr_option_choice_prompt
    ,s_arr_option_choice
    ,c_is_arr_option_choice_visible
    ,s_positive_button_text
    ,c_is_positive_button_visible
    ,s_negative_button_text
    ,c_is_negative_button_visible
    ,s_neutral_button_text
    ,s_is_neutral_button_visible
    ,s_action_taken
    ,dt_action_taken
 ,s_username
    ,c_open_custom_module
        FROM mcjim_all_prog.dbo.Tasks tasks

        left outer join mcjim_all_prog.dbo.user_accounts ua
        on tasks.s_recipient = ua.s_employee_number

        where ((s_recipient = '${username}') or (s_username = '${username}'))
        and s_action_taken is null
        order by d_task_id asc
        `

        const result = await ExecuteRecordSetQry(query);
        return result.recordset;
    } catch (error) {
        return { success: false, error: error.message }
    }
}




export async function CheckGetEmployeeNumberOfUsername(username) {

    try {
        const query = `
        declare @s_username varchar(20) = UPPER('${username}')
        declare @d_count int
        select @d_count = count(*)
        from mcjim_all_prog.dbo.user_accounts
        where upper(s_username) = @s_username

        if @d_count = 0
        BEGIN
            --not username, check if employee number is existing
            SELECT @d_count = COUNT(*)
            FROM mcjim_all_prog.dbo.Employee
            WHERE AccessNumber = @s_username

            IF @d_count = 0
            BEGIN
                SELECT 'X'
            END
            ELSE
            BEGIN
                SELECT @s_username
            END
        END
        ELSE
        BEGIN
            --Get the linked Employee Number
            SELECT CASE WHEN s_employee_number IS NULL THEN 'X' else s_employee_number end as s_employee_number
            FROM mcjim_all_prog.dbo.user_accounts
            WHERE UPPER(s_username) = @s_username
        END
    `;

        const result = await ExecuteRecordSetQry(query);

        return result.recordset
    } catch (error) {
        return { success: true, error: error.message }
    }
}



export async function Create_New_Task(
    d_parent_task,
    d_originating_task,
    ReferenceNumber,
    s_recipient_employee_number,
    s_sender_empoyee_number,
    Subject,
    Details,
    CategoryID,
    Category_Name,
    ChoicePrompt,
    Choices,
    is_option_choice_visible,
    PositiveButtonText,
    is_positive_button_visible,
    NegativeButtonText,
    is_negative_button_visible,
    NeutralButtonText,
    is_neutral_button_visible,
    open_custom_module
) {
    try {
        const query = `
            INSERT INTO mcjim_all_prog.dbo.Tasks(
                c_is_parent,
                d_parent_task,
                d_originating_task,
                s_reference_number,
                s_recipient,
                s_sender,
                dt_sent,
                s_subject,
                s_details,
                s_category_id,
                s_category_name,
                s_arr_option_choice_prompt,
                s_arr_option_choice,
                c_is_arr_option_choice_visible,
                s_positive_button_text,
                c_is_positive_button_visible,
                s_negative_button_text,
                c_is_negative_button_visible,
                s_neutral_button_text,
                s_is_neutral_button_visible,
                c_open_custom_module
            )
            OUTPUT INSERTED.d_task_id AS d_task_id
            VALUES(
                'Y',
                '${d_parent_task}',
                '${d_originating_task}',
                '${ReferenceNumber}',
                '${s_recipient_employee_number}',
                '${s_sender_empoyee_number}',
                GETDATE(),
                '${Subject}',
                '${Details}',
                '${CategoryID}',
                '${Category_Name}',
                '${ChoicePrompt}',
                '${Choices}',
                '${is_option_choice_visible}',
                '${PositiveButtonText}',
                '${is_positive_button_visible}',
                '${NegativeButtonText}',
                '${is_negative_button_visible}',
                '${NeutralButtonText}',
                '${is_neutral_button_visible}',
                '${open_custom_module}'
            )
        `;

        // 🔹 Use ExecuteRecordSetQry to return OUTPUT recordset
        const result = await ExecuteRecordSetQry(query);
        return result; // { recordset: [ { d_task_id: 45605 } ] }

    } catch (error) {
        console.error("❌ Error in Create_New_Task:", error);
        return { success: false, error: error.message };
    }
}



//get all users with active subscription
export async function GetUserSubs(desLocation) {
    try {

        const query = `
        SELECT s_user_name from mcjim_all_prog.dbo.user_subscription
        WHERE s_subscription_code = '${desLocation}'
        and c_is_subscribed = 'Y'
    `;

        const result = await ExecuteRecordSetQry(query)
        return result.recordset
    } catch (error) {
        console.log(error.message)
        return { success: false, error: error.message }
    }
}


export async function UpdateTask(d_parent_task, s_reference_number, task_id) {

    try {
        const query = `
            UPDATE mcjim_all_prog.dbo.Tasks
            SET d_parent_task = '${d_parent_task}'
            , s_reference_number = '${s_reference_number}'
            , d_originating_task = '${task_id}'
            WHERE d_task_id = '${d_parent_task}'
            `;

        const result = await ExecuteQry(query);


        return result.recordset
    } catch (error) {
        return error.message
    }
}



//  For displaying the list item na per box na scan
export async function BRAP_Get_Items_For_ITR(TRQ_Number) {

    try {
        const query = `
            select case when item.s_item_code is null
            then s_item_code_box_code
            else s_item_desc + ' (' + rtrim(s_color) + ' ' + rtrim(s_size) + ')'
            end as s_display
        , case when item.s_item_code is null
            then s_item_code_box_code
            else s_barcode_no
            end as s_barcode_no
        ,cast(d_qty as decimal(13,0)) d_qty
            
        from mcjim_all_prog.dbo.im_trq_detail_2 trqd

        left outer join erpdata_new.dbo.item item
        on trqd.s_item_code_box_code = item.s_item_code

        where trqd.s_trq_number = '${TRQ_Number}'
        `;

        const result = await ExecuteRecordSetQry(query);
        return result.recordset
    } catch (error) {
        return error.message
    }

}



export async function ScanBox(boxNumber) {

    try {
        const query = `
        SELECT d_qty,
        s_item_code_box_code
         FROM mcjim_all_prog.dbo.im_trq_detail_2 where s_item_code_box_code  = '${boxNumber}'
        `
        const result = await ExecuteRecordSetQry(query);

        return result.recordset
    } catch (error) {
        return error.message
    }
}



//---------------------------------------------------------------------------------------------------------------------
// Firs Get the TDIN by using TRQ number
export async function BRAP_ITR_Get_TRQ_TD_NUmber(trq_number) {

    try {
        const qry = `
        select top 1 s_to_number  from erpdata_new.dbo.to_source_detail
        where s_ref_doc_number = '${trq_number}'
        `
        const result = await ExecuteRecordSetQry(qry);

        return result.recordset

    } catch (error) {
        return error.message
    }
}





//  After after getting the TDIN the run this 

export async function BRAP_Save_Internal_Transfer_Receiving(TDIN_number, Items, username) {
    const dateNow = new Date().toISOString(); // format like C#

    try {
        // 1️ Approve the transfer delivery
        const qry1 = `
      EXEC mcjim_all_prog.dbo.sp_picking_approve_transfer_delivery 
      '${TDIN_number}', 
      '${username.toUpperCase()}'
    `;
        await ExecuteQry(qry1);

        // 2️ Create open TR
        const qry2 = `
      EXEC mcjim_all_prog.dbo.sp_create_manual_transfer_receiving 
      '${TDIN_number}', '${username.toUpperCase()}', '${dateNow}', '${Items}'
    `;
        await ExecuteQry(qry2);

        // 3️Get the TR number
        const query0 = `
      SELECT s_tr_number 
      FROM erpdata_new.dbo.tr_header
      WHERE s_ref_doc_number = '${TDIN_number}'
    `;
        const result = await ExecuteRecordSetQry(query0);

        // Return single TR number if exists, else 'X'
        const s_ref_tr_number =
            result.recordset.length > 0 ? result.recordset[0].s_tr_number : "X";

        return {
            ResultCode: "OK",
            ResultDescription: "Operation has been completed.",
            ResultDescription2: s_ref_tr_number,
        };
    } catch (error) {
        return {
            ResultCode: "ERROR",
            ResultDescription: error.message,
        };
    }
}


//  the after this if no error and nakuha nanatin yong trq number 
//  gagamtin natin yong trq number para kunin yong name ng requestor

export async function BRAP_Get_TRQ_requestor(trq_number) {

    try {

        const qry = `
            select top 1 s_requested_by from erpdata_new.dbo.im_trq_header
            where s_trq_number  = '${trq_number}'
            `
        const result = await ExecuteRecordSetQry(qry);

        return result.recordset[0]
    } catch (error) {
        return error.message
    }

}


//  Updating the Task

export async function Update_User_Task(TaskID, ActionButtonResponse, OptionChoice, Username) {

    try {

        if (ActionButtonResponse === 'FINISHED') {
            const qry2 = `
             UPDATE {dashboard_database}.dbo.Tasks
                SET s_action_taken = '${ActionButtonResponse}'
                , s_option_choice_selected = '${OptionChoice}'
                , dt_action_taken = GETDATE()
                , s_action_taken_by = '${Username}'

                WHERE d_task_id = ${TaskID}
            `

            await ExecuteQry(qry2)

            return `Task ${TaskID} has been marked as finished`
        }

    } catch (error) {
        return error.message
    }



}










// for Get the Contact numbers
// select FirstName + ' ' + left(LastName,1) + '.'
// , ContactNumber

// from [SentryDB].SentryLocal.dbo.Personnels pb

// inner join mcjim_all_prog.dbo.HRIS_employees hris
// on   hris.s_id collate SQL_Latin1_General_CP1_CS_AS  = pb.AccessNumber collate SQL_Latin1_General_CP1_CS_AS

// where AccessNumber = '10029'