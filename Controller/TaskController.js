
import { BRAP_Get_Items_For_ITR, BRAP_Get_TRQ_requestor, BRAP_ITR_Get_TRQ_TD_NUmber, BRAP_Save_Internal_Transfer_Receiving, CheckGetEmployeeNumberOfUsername, Create_New_Task, GetUserSubs, GetUserTaskPending, ScanBox, Update_User_Task, UpdateTask } from "../Model/Task.js";
import { io } from "../index.js";

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
            OpenCustomModule,
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

        // 2️ Prepare recipients
        const recList = Recipients?.split(',').map(r => r.trim()).filter(r => r) || [];

        console.log(recList, 'recList')

        // If no recipients, create a task with empty recipient
        if (recList.length === 0) {
            const insertResult = await Create_New_Task(
                0, // parentTaskId
                0, // originatingTask
                ReferenceNumber,
                "", // s_recipient_employee_number is empty
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
        } else {
            // Loop through recipients
            let parentTaskId = 0;
            for (let i = 0; i < recList.length; i++) {
                const recipientName = recList[i];
                const empCheck = await CheckGetEmployeeNumberOfUsername(recipientName);

                if (!empCheck?.length || empCheck[0].s_employee_number === "X") {
                    console.warn(`⚠️ Skipped ${recipientName}`);
                    continue;
                }

                const s_recipient_employee_number = empCheck[0].s_employee_number;

                const insertResult = await Create_New_Task(
                    parentTaskId,
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
                    if (i === 0) parentTaskId = insertedTaskId; // first task becomes parent
                }
            }
        }

        //  Manage Na Nofifictaion when the Task is Created
      // Emit WebSocket event to all connected users (later you can limit to the recipient only)
        io.emit("taskCreated", {
            message: `🆕 New task created by ${Username}`,
            createdBy: Username,
            reference: ReferenceNumber,
        });

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




//  Seconnd controller to create Task

// Create Task for a Single Recipient Only
export async function CreateTaskSingleRecipient(req, res) {
    try {
        const {
            ReferenceNumber,
            CategoryID,
            Subject,
            Details,
            Recipient, // only one recipient username or employee number
            ChoicePrompt,
            Choices,
            PositiveButtonText,
            NegativeButtonText,
            NeutralButtonText,
            Username,
            OpenCustomModule,
        } = req.body;

        // 1️⃣ Get sender employee number
        const empResult = await CheckGetEmployeeNumberOfUsername(Username);
        if (!empResult?.length || empResult[0].s_employee_number === 'X') {
            return res.status(400).json({
                success: false,
                message: `Invalid sender employee number for ${Username}`,
            });
        }
        const s_sender_empoyee_number = empResult[0].s_employee_number;
        const categoryName = await GetTaskcategoryName(CategoryID);

        const is_option_choice_visible = ChoicePrompt?.length ? "Y" : "N";
        const is_positive_button_visible = PositiveButtonText?.length ? "Y" : "N";
        const is_negative_button_visible = NegativeButtonText?.length ? "Y" : "N";
        const is_neutral_button_visible = NeutralButtonText?.length ? "Y" : "N";
        const open_custom_module = OpenCustomModule?.length ? "Y" : "N";

        // 2️⃣ Validate single recipient
        if (!Recipient || !Recipient.trim()) {
            return res.status(400).json({
                success: false,
                message: "Recipient is required for this request",
            });
        }

        // Check if recipient is valid
        const empCheck = await CheckGetEmployeeNumberOfUsername(Recipient);
        if (!empCheck?.length || empCheck[0].s_employee_number === "X") {
            return res.status(400).json({
                success: false,
                message: `Invalid recipient employee number for ${Recipient}`,
            });
        }

        const s_recipient_employee_number = empCheck[0].s_employee_number;

        // 3️⃣ Create the task
        const insertResult = await Create_New_Task(
            0, // parent task
            0, // originating task
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

        // 4️⃣ Success
        return res.status(200).json({
            success: true,
            ResultDescription: `Task for ${Recipient} created successfully`,
            taskId: insertedTaskId,
        });

    } catch (error) {
        console.error("❌ Error in CreateTaskSingleRecipient:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
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


export async function ScanBoxes(req, res) {

    const { boxNumber } = req.query;

    try {
        const box_number = await ScanBox(boxNumber);

        if (box_number.length <= 0) {

            return res.status(404).json({
                success: false,
                message: "Not Found"
            })
        }

        return res.status(200).json({
            success: true,
            Box: box_number[0]
        })



    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message
        })
    }

}



//  Get the TDINnumber using TRQ NUMBER
export async function Get_TDIN_number_By_Trq(req, res) {

    const { trq_number } = req.query;


    try {

        const result = await BRAP_ITR_Get_TRQ_TD_NUmber(trq_number);

        return res.status(200).json({
            success: true,
            tdin: result[0]
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: err.message
        })
    }

}

//  After after getting the TDIN the run this 
export async function Save_Internal_Transfer_Receiving(req, res) {
    const { TDN_NUMBER, items, username } = req.body;

    try {
        const result = await BRAP_Save_Internal_Transfer_Receiving(
            TDN_NUMBER,
            items,
            username
        );

        return res.status(200).json({
            success: true,
            response: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

//  get the name of requestor

export async function GetNameRequestor(req, res) {

    const { trq_number } = req.query;

    try {

        const result = await BRAP_Get_TRQ_requestor(trq_number);

        return res.status(200).json({
            success: true,
            name: result.s_requested_by
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: err.message
        })

    }

}



export async function UpdateTaskForAcknowledge(req, res) {

    const { TaskId, s_action_taken_by } = req.body;

    try {
        const result = await Update_User_Task(TaskId, s_action_taken_by);

        if (result) {
            return res.status(200).json({
                success: true,
                message: result
            })
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }

}