import { ApiProperty } from "@nestjs/swagger"
import { Gender } from "src/const"

export class UpdateUserDto {

    @ApiProperty({
        nullable: true
    })
    firstName: string

    @ApiProperty({
        nullable: true
    })
    lastName: string

    @ApiProperty({
        nullable: true
    })
    gender: Gender

    @ApiProperty({
        nullable: true
    })
    dob: Date
}