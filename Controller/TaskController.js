
import { BRAP_Get_Items_For_ITR, CheckGetEmployeeNumberOfUsername, Create_New_Task, GetUserSubs, GetUserTaskPending, UpdateTask } from "../Model/Task.js";


export async function GetTaskcategoryName(Category) {
    const names = {
        SUPPLIER_ACCT_REG: "Supplier Account Registration",
        TASK: "Composed Tasks",
        QCKTASK: "Quick Tasks",
        USER_ACCOUNT_EMPLOYEE_NUMBER_ASSOC: "User Account - Employee Number Association",
        USER_ACCOUNT_SALESMAN_CODE_ASSOC: "User Account - Salesman Code Association",
        DIRECT_SELLING_SALES_INVOICE: "Direct Selling Invoice",
        NEW_DIRECT_SELLING_REQUEST: "New Direct Selling Request",
        INTERNAL_TRANSFER_RECEIVING: "Internal Transfer Receiving",
        INTERNAL_TRANSFER_RECEIVING_ACKNOWLEDGE: "Internal Transfer Receiving Acknowledgement"
    };

    return names[Category] || "Not available";
}

const UserSubscription = {
    INTERNAL_TRANSFER_RECEIVING_BR0: "INTERNAL_TRANSFER_RECEIVING_BR0",
    INTERNAL_TRANSFER_RECEIVING_BR: "INTERNAL_TRANSFER_RECEIVING_BR",
    INTERNAL_TRANSFER_RECEIVING_BR2: "INTERNAL_TRANSFER_RECEIVING_BR2",
    SYSTEM_ADMINISTRATOR: "SYSTEM_ADMINISTRATOR"
}



export async function GetUserSub(req, res) {

    const { desLocationCode } = req.body;

    let sub = "";
    switch (desLocationCode) {

        case "BR0":
            sub = UserSubscription.INTERNAL_TRANSFER_RECEIVING_BR0
            break;

        case "BR":
            sub = UserSubscription.INTERNAL_TRANSFER_RECEIVING_BR
            break;

        case "BR2":
            sub = UserSubscription.INTERNAL_TRANSFER_RECEIVING_BR2
            break;

        default:
            sub = "This location is invalid";

    }

    const result = await GetUserSubs(sub);

    return res.status(200).json({
        success: true,
        result: result,

    })
}



//  Get user Task Pending
export async function GetUserPendingTask(req, res) {

    const { username } = req.body;

    try {
        if (username.trim() !== "") {

            const result = await GetUserTaskPending(username);

            return res.status(200).json({
                success: true,
                Task: result
            })
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
}


//  create Task
export async function CreateTask(req, res) {
    try {
        const {
            ReferenceNumber,
            CategoryID,
            Subject,
            Details,
            Recipients,
            ChoicePrompt,
            Choices,
            PositiveButtonText,
            NegativeButtonText,
            NeutralButtonText,
            Username,
            OpenCustomModule
        } = req.body;

        // 1️ Get sender employee number
        const empResult = await CheckGetEmployeeNumberOfUsername(Username);
        if (!empResult?.length || empResult[0].s_employee_number === 'X') {
            return res.status(400).json({
                success: false,
                message: `Invalid employee number for ${Username}`
            });
        }

        const s_sender_empoyee_number = empResult[0].s_employee_number;
        const categoryName = await GetTaskcategoryName(CategoryID);

        const is_option_choice_visible = ChoicePrompt?.length ? "Y" : "N";
        const is_positive_button_visible = PositiveButtonText?.length ? "Y" : "N";
        const is_negative_button_visible = NegativeButtonText?.length ? "Y" : "N";
        const is_neutral_button_visible = NeutralButtonText?.length ? "Y" : "N";
        const open_custom_module = OpenCustomModule?.length ? "Y" : "N";

        const recList = Recipients.split(',').map(r => r.trim()).filter(r => r);

        let parentTaskId = 0;

        // 2️ Loop recipients
        for (let i = 0; i < recList.length; i++) {
            const recipientName = recList[i];
            const empCheck = await CheckGetEmployeeNumberOfUsername(recipientName);

            if (!empCheck?.length || empCheck[0].s_employee_number === "X") {
                console.warn(`⚠️ Skipped ${recipientName}`);
                continue;
            }

            const s_recipient_employee_number = empCheck[0].s_employee_number;

            const insertResult = await Create_New_Task(
                parentTaskId, // 0 for first, parent's ID for next
                parentTaskId,
                ReferenceNumber,
                s_recipient_employee_number,
                s_sender_empoyee_number,
                Subject,
                Details,
                CategoryID,
                categoryName,
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
            );

            const insertedTaskId = insertResult.recordset?.[0]?.d_task_id || 0;

            if (insertedTaskId > 0) {
                await UpdateTask(insertedTaskId, ReferenceNumber, insertedTaskId, insertedTaskId);
            }
        }



        return res.status(200).json({
            success: true,
            ResultDescription: `Task has been created successfully`
        });

    } catch (error) {
        console.error("❌ Error in CreateTask:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}



export async function Get_Items_For_ITR(req, res) {

    const { TRQ_NUMBER } = req.body;


    try {

        const result = await BRAP_Get_Items_For_ITR(TRQ_NUMBER);

        if (result.length > 0) {
            return res.status(200).json({
                success: true,
                data: result
            })
        }

        return res.status(200).json({
            success: true,
            data: "No Item Found"
        })
    } catch (error) {
        return res.status(200).json({
            success: false,
            error: error.message
        })
    }
}
