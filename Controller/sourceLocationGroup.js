import { SearchLocationGroup, HasAccessLocation, LoadLocationGroup } from "../Model/sourceLocationGroup.js";

export async function GetLocationGroupInfo(req, res) {
    const { sourceLGroup } = req.body;

    try {
        const result = await SearchLocationGroup(sourceLGroup);

        if (result.length === 0) {
            return res.status(404).json({ message: "No matching locations found." });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in GetLocationGroupInfo:", error);
        return res.status(500).json({ message: "Internal Server Error", error });
    }
}


export async function ValidateLocation(req, res) {

    try {
        const { username, location } = req.body
        const result = await HasAccessLocation(username, location);

        if (result == 0) {

            return res.status(200).json({
                HasAccess: result,
            })
        }

        return res.status(200).json({
            HasAccess: result,
        })

    } catch (error) {
        res.status(500).json(error)
    }
}


//  location group for Consignment Page

export async function LoadLocation(req, res) {

    try {
        const locationGroup = await LoadLocationGroup();

        if (locationGroup.length > 0) {
            return res.status(200).json({
                success: true,
                locationGroup: locationGroup
            })
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }

}