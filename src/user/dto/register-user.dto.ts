import { ApiProperty } from "@nestjs/swagger"
import { Gender } from "src/const"

export class RegisterUserDto {
    @ApiProperty({
        nullable: false
    })
    username: string

    @ApiProperty({
        nullable: false
    })
    email: string

    @ApiProperty({
        nullable: false

    })
    password: string

    @ApiProperty({
        nullable: false
    })
    confirmPassword: string

}