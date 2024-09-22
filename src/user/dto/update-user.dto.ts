import { ApiProperty } from "@nestjs/swagger"
import { Gender } from "src/const"

export class UpdateUserDto{
    @ApiProperty()
    firstName: string

    @ApiProperty()
    lastName: string

    @ApiProperty()
    gender: Gender

    @ApiProperty()
    dob: Date

}