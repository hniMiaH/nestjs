import { ApiProperty } from "@nestjs/swagger"

export class LoginGGDto {
    @ApiProperty({
        nullable: false
    })
    firstName: string;

    @ApiProperty({
        nullable: false
    })
    lastName: string;

    @ApiProperty({
        nullable: false
    })
    email: string

    @ApiProperty({
        nullable: false
    })
    avatar: string
}