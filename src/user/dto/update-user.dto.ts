import { ApiProperty } from "@nestjs/swagger"
import { Gender } from "src/const"

export class UpdateUserDto {

    @ApiProperty({
        nullable: true,   
        required: false
    })
    firstName: string

    @ApiProperty({
        nullable: true,   
        required: false
    })
    lastName: string

    @ApiProperty({
        nullable: true,   
        required: false
    })
    gender: Gender

    @ApiProperty({
        nullable: true,   
        required: false
    })
    dob: Date
}