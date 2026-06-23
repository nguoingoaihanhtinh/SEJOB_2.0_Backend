import studentRepository from "@/repositories/student.repository";
import { StudentQueryAllParams, StudentQueryParams, StudentUpdate } from "@/types/common";
import { NotFoundError } from "@/utils/errors";

export class StudentService {
    async findAll(input: StudentQueryAllParams) {
        const students = await studentRepository.findAll(input);

        return students;
    }

    async findOne(input: StudentQueryParams) {

        const student = await studentRepository.findOne(input);

        if (!student) {
            throw new NotFoundError({ message: `Student with ID ${input.user_id || input.student_id} not found` });
        }
        return student;
    }

    async update(input: { studentId: number; studentData: StudentUpdate }) {
        const { studentId, studentData } = input;

        const student = await studentRepository.update({
            studentId,
            studentData,
        });

        return student;
    }
}

export default new StudentService();