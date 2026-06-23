import studentService from "@/services/student.service";
import convert from "@/utils/convert";
import { BadRequestError } from "@/utils/errors";
import { Request, Response } from "express-serve-static-core";
import _ from "lodash";
import { MessageUtil } from "@/utils/MessageUtil";

export async function getStudents(req: Request, res: Response) {
    const { page, limit } = req.query;

    const { data: students, pagination } = await studentService.findAll({
        ...req.query,
        page: _.toInteger(page) || 1,
        limit: _.toInteger(limit) || 10,
        student_ids: convert.split(req.query.student_ids as string, ',', Number),
    });

    res.status(200).json({
        success: true,
        data: students,
        pagination,
    });
}

export async function getStudent(req: Request, res: Response) {
    const id = req.params.id;

    if (!id) {
        throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID")});
    }

    const student = await studentService.findOne({ student_id: _.toNumber(id) });

    res.status(200).json({
        success: true,
        data: student,
    });
}

export async function updateStudent(req: Request, res: Response) {
    const { id } = req.params;
    const { studentData } = req.body;

    if (!id) {
        throw new BadRequestError({ message: MessageUtil.get("MISSING_REQUIRED_PARAM_ID") });
    }

    const student = await studentService.update({
        studentId: _.toNumber(id),
        studentData: studentData,
    });

    res.status(200).json({
        success: true,
        data: student,
    });
}
